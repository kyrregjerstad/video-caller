<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';

	const callId = page.params.callId;

	// State for preview
	let localStream: MediaStream;
	let localVideo: HTMLVideoElement;
	let isMicEnabled = $state(true);
	let isCameraEnabled = $state(true);

	// Initialize preview
	async function initializePreview() {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});

			if (localVideo) {
				localVideo.srcObject = localStream;
			}
		} catch (error) {
			console.error('Error accessing media devices:', error);
		}
	}

	function toggleMic() {
		if (localStream) {
			const audioTrack = localStream.getAudioTracks()[0];
			if (audioTrack) {
				isMicEnabled = !isMicEnabled;
				audioTrack.enabled = isMicEnabled;
			}
		}
	}

	function toggleCamera() {
		if (localStream) {
			const videoTrack = localStream.getVideoTracks()[0];
			if (videoTrack) {
				isCameraEnabled = !isCameraEnabled;
				videoTrack.enabled = isCameraEnabled;
			}
		}
	}

	function joinCall() {
		goto(`/call/${callId}/room`);
	}

	// Cleanup
	function cleanup() {
		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
		}
	}

	$effect(() => {
		initializePreview();
		return () => cleanup();
	});
</script>

<svelte:head>
	<title>Setup - Call {callId}</title>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 p-4">
	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<Card.Title>Setup your devices</Card.Title>
			<Card.Description>Check your camera and microphone before joining the call</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Preview video -->
			<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-800">
				<video bind:this={localVideo} autoplay playsinline muted class="h-full w-full object-cover"
				></video>
				<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
					Preview
				</div>
			</div>

			<!-- Controls -->
			<div class="flex justify-center gap-4">
				<Button variant={isMicEnabled ? 'secondary' : 'destructive'} onclick={() => toggleMic()}>
					<span class="material-icons">{isMicEnabled ? 'mic' : 'mic_off'}</span>
				</Button>
				<Button
					variant={isCameraEnabled ? 'secondary' : 'destructive'}
					onclick={() => toggleCamera()}
				>
					<span class="material-icons">{isCameraEnabled ? 'videocam' : 'videocam_off'}</span>
				</Button>
			</div>

			<div class="flex justify-end pt-4">
				<Button onclick={() => joinCall()}>Join Call</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
