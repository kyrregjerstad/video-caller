<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';

	// Get the call ID from the route parameters
	const callId = page.params.callId;

	// State for local video stream
	let localStream: MediaStream;
	let localVideo: HTMLVideoElement;

	// State for remote video stream
	let remoteStream: MediaStream;
	let remoteVideo: HTMLVideoElement;

	// Initialize the call when the component mounts
	async function initializeCall() {
		try {
			// Request user media permissions
			localStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});

			// Set the local video stream
			if (localVideo) {
				localVideo.srcObject = localStream;
			}
		} catch (error) {
			console.error('Error accessing media devices:', error);
		}
	}

	function endCall() {
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
				<Button variant="destructive" onclick={endCall}>End Call</Button>
			</Card.Title>
		</Card.Header>
		<Card.Content>
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
					<video bind:this={remoteVideo} autoplay playsinline class="h-full w-full object-cover" />
					<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
						Remote User
					</div>
				</div>
			</div>

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
