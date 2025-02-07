<script lang="ts">
	import { page } from '$app/state';

	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { CallManager, setCallManager } from '$lib/state/call.svelte';
	import { VideoIcon, VideoOffIcon, MicIcon, MicOffIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	// Get the call ID from the route parameters
	const callId = page.params.callId;

	const callManager = setCallManager(new CallManager(callId));

	$effect(() => {
		callManager.initialize();
		return () => callManager.cleanup();
	});

	function handleCopyInviteLink() {
		try {
			navigator.clipboard.writeText(window.location.href);
			toast.success('Invite link copied to clipboard');
		} catch (error) {
			toast.error('Failed to copy invite link');
		}
	}
</script>

<svelte:head>
	<title>Video Call - {callId}</title>
</svelte:head>

<div class="flex min-h-screen flex-col gap-4 bg-gray-950 p-4">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title class="flex items-center justify-between">
				<span>Call: {callId}</span>
				<Button variant="destructive" onclick={() => callManager.clientEndCall()}>End Call</Button>
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if callManager.mediaState.mediaError}
				<div class="mb-4 rounded-lg bg-red-500/10 p-4 text-red-500">
					<p>{callManager.mediaState.mediaError}</p>
					<Button
						variant="outline"
						class="mt-2"
						onclick={() => callManager.mediaState.startLocalPlayback()}
					>
						Retry Camera Access
					</Button>
				</div>
			{/if}
			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<!-- Local video -->
				<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-800">
					<!-- svelte-ignore element_invalid_self_closing_tag -->
					<video
						bind:this={callManager.mediaState.localVideo}
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
						bind:this={callManager.peerState.peerVideo}
						autoplay
						playsinline
						class={cn(
							'h-full w-full object-cover',
							callManager.peerState.callState === 'connected' && 'opacity-100',
							callManager.peerState.callState === 'connecting' && 'opacity-50',
							callManager.peerState.callState === 'disconnected' && 'opacity-0'
						)}
					/>
					<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
						Remote User
					</div>
				</div>
			</div>

			call state: {callManager.peerState.callState}

			<div class="mt-4 flex justify-center gap-4">
				<Button
					variant="secondary"
					onclick={() => callManager.mediaState.toggleAudio()}
					class={cn(
						!callManager.mediaState.isAudioEnabled &&
							'bg-destructive text-destructive-foreground hover:bg-destructive/90'
					)}
				>
					{#if callManager.mediaState.isAudioEnabled}
						<MicIcon />
					{:else}
						<MicOffIcon />
					{/if}
				</Button>
				<Button
					variant="secondary"
					onclick={() => callManager.mediaState.toggleVideo()}
					class={cn(
						!callManager.mediaState.isVideoEnabled &&
							'bg-destructive text-destructive-foreground hover:bg-destructive/90'
					)}
				>
					{#if callManager.mediaState.isVideoEnabled}
						<VideoIcon />
					{:else}
						<VideoOffIcon />
					{/if}
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<Button variant="secondary" class="mx-auto w-fit max-w-xs" onclick={handleCopyInviteLink}>
		Copy invite link
	</Button>
</div>
