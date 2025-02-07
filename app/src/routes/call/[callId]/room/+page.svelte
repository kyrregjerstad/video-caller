<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		PUBLIC_STUN_SERVER,
		PUBLIC_TURN_SERVER_URL,
		PUBLIC_TURN_SERVER_USERNAME,
		PUBLIC_TURN_SERVER_PASSWORD,
		PUBLIC_WS_URL
	} from '$env/static/public';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	// Get the call ID from the route parameters
	const callId = page.params.callId;

	// State for local video stream
	let localStream: MediaStream;
	let localVideo: HTMLVideoElement;
	let mediaError = $state<string | null>(null);
	let peerConnection = $state<RTCPeerConnection | null>(null);
	let callState = $state<'connecting' | 'connected' | 'disconnected' | 'ended'>('connecting');

	// State for remote video stream
	let remoteStream = $state<MediaStream | null>(null);
	let peerVideo = $state<HTMLVideoElement | null>(null);

	let ws = $state<WebSocket | null>(null);

	const wsSend = (data: any) => {
		if (ws) {
			ws.send(JSON.stringify(data));
		}
	};

	const iceServers = import.meta.env.PROD
		? [
				{
					urls: [`${PUBLIC_STUN_SERVER}:3478`]
				},
				{
					urls: [`${PUBLIC_TURN_SERVER_URL}:3478?transport=udp`],
					username: PUBLIC_TURN_SERVER_USERNAME,
					credential: PUBLIC_TURN_SERVER_PASSWORD
				},
				{
					urls: [`${PUBLIC_TURN_SERVER_URL}:3478?transport=tcp`],
					username: PUBLIC_TURN_SERVER_USERNAME,
					credential: PUBLIC_TURN_SERVER_PASSWORD
				},
				{
					urls: [`${PUBLIC_TURN_SERVER_URL}:5349?transport=tcp`],
					username: PUBLIC_TURN_SERVER_USERNAME,
					credential: PUBLIC_TURN_SERVER_PASSWORD
				}
			]
		: [
				{
					urls: [`${PUBLIC_STUN_SERVER}:3478`]
				}
			];

	async function connectToPeer() {
		peerConnection = new RTCPeerConnection({
			iceServers
		});

		remoteStream = new MediaStream();
		if (peerVideo) {
			peerVideo.srcObject = remoteStream;
		}

		if (!localStream) await startLocalPlayback();

		localStream.getTracks().forEach((track) => {
			peerConnection!.addTrack(track, localStream);
		});

		peerConnection.ontrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				remoteStream!.addTrack(track);
			});
		};

		peerConnection.onicecandidate = (event) => {
			if (event.candidate) {
				wsSend({ type: 'candidate', candidate: event.candidate });
			}
		};
	}

	async function handleMessages(event: MessageEvent) {
		const message = JSON.parse(event.data);
		console.log(message);

		if (message.type === 'joined') {
			await makeCall();
		} else if (message.type === 'candidate') {
			await acceptCandidate(message.candidate);
		} else if (message.type === 'offer') {
			await answerCall(message.offer);
		} else if (message.type === 'answer') {
			await startCall(message.answer);
		} else if (message.type === 'left') {
			await endCall();
		} else {
			console.error('Unknown message type:', message.type);
			callState = 'disconnected';
		}
	}

	async function makeCall() {
		await connectToPeer();
		if (!peerConnection) return;

		const offer = await peerConnection.createOffer();
		await peerConnection.setLocalDescription(offer);
		wsSend({ type: 'offer', offer });
		callState = 'connected';
	}

	async function acceptCandidate(candidate: RTCIceCandidate) {
		if (!peerConnection) return;
		try {
			await peerConnection.addIceCandidate(candidate);
		} catch (error) {
			console.error('Error adding ice candidate:', error);
		}
		callState = 'connected';
	}

	async function answerCall(offer: RTCSessionDescriptionInit) {
		await connectToPeer();
		if (!peerConnection) return;
		await peerConnection.setRemoteDescription(offer);
		const answer = await peerConnection.createAnswer();
		await peerConnection.setLocalDescription(answer);
		wsSend({ type: 'answer', answer });
		callState = 'connected';
	}

	async function startCall(answer: RTCSessionDescriptionInit) {
		if (!peerConnection) return;
		await peerConnection.setRemoteDescription(answer);
		callState = 'connected';
	}

	async function endCall() {
		if (!peerConnection) return;
		peerConnection.close();
		peerConnection = null;
		callState = 'disconnected';
	}

	async function startLocalPlayback() {
		try {
			const config = {
				video: {
					width: {
						min: 1280,
						ideal: 1920
					},
					height: {
						min: 720,
						ideal: 1080
					}
				},
				audio: false
			};

			mediaError = null;
			localStream = await navigator.mediaDevices.getUserMedia(config);

			if (localVideo) {
				localVideo.srcObject = localStream;
			}
		} catch (error) {
			console.error('Error accessing media devices:', error);
			if (error instanceof DOMException) {
				switch (error.name) {
					case 'NotAllowedError':
						mediaError = 'Camera access was denied. Please grant permission and try again.';
						break;
					case 'NotFoundError':
						mediaError = 'No camera or microphone found. Please check your devices.';
						break;
					case 'NotReadableError':
						mediaError = 'Could not access your camera. It might be in use by another application.';
						break;
					default:
						mediaError = `Could not access media devices: ${error.message}`;
				}
			} else {
				mediaError = 'An unexpected error occurred while accessing media devices.';
			}
			throw error;
		}
	}

	// Initialize the call when the component mounts
	async function initializeCall() {
		try {
			await startLocalPlayback();

			ws = new WebSocket(`${PUBLIC_WS_URL}/${callId}`);
			ws.onmessage = handleMessages;
			ws.onopen = () => wsSend({ type: 'joined' });
		} catch (error) {
			console.error('Error initializing call:', error);
		}
	}

	async function retryMediaAccess() {
		try {
			await startLocalPlayback();
		} catch (error) {
			console.error('Error retrying media access:', error);
		}
	}

	function clientEndCall() {
		endCall();
		goto(`/call/${callId}/finished`);
	}

	// Cleanup when component is destroyed
	function cleanup() {
		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
		}
	}

	$effect(() => {
		initializeCall();
		return () => cleanup();
	});
</script>

<svelte:head>
	<title>Video Call - {callId}</title>
</svelte:head>

<div class="flex min-h-screen flex-col gap-4 bg-gray-950 p-4">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title class="flex items-center justify-between">
				<span>Call: {callId}</span>
				<Button variant="destructive" onclick={clientEndCall}>End Call</Button>
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if mediaError}
				<div class="mb-4 rounded-lg bg-red-500/10 p-4 text-red-500">
					<p>{mediaError}</p>
					<Button variant="outline" class="mt-2" onclick={retryMediaAccess}>
						Retry Camera Access
					</Button>
				</div>
			{/if}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- Local video -->
				<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-800">
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<video
						bind:this={localVideo}
						autoplay
						playsinline
						muted
						class="h-full w-full object-cover"
					/>
					<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
						You
					</div>
				</div>

				<!-- Remote video -->
				<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-800">
					<!-- svelte-ignore a11y_media_has_caption -->
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<video
						bind:this={peerVideo}
						autoplay
						playsinline
						class={cn(
							'h-full w-full object-cover',
							callState === 'connected' && 'opacity-100',
							callState === 'connecting' && 'opacity-50',
							callState === 'disconnected' && 'opacity-0'
						)}
					/>
					<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
						Remote User
					</div>
				</div>
			</div>

			call state: {callState}

			<div class="mt-4 flex justify-center gap-4">
				<Button variant="secondary">
					<span class="material-icons">mic</span>
				</Button>
				<Button variant="secondary">
					<span class="material-icons">videocam</span>
				</Button>
				<Button variant="secondary">
					<span class="material-icons">screen_share</span>
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
