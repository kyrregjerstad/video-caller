<script lang="ts">
	import { page } from '$app/state';
	import CallControls from './CallControls.svelte';
	import ClientVideoTile from './ClientVideoTile.svelte';
	import PeerVideoTile from './PeerVideoTile.svelte';
	import DevToolbar from '$lib/components/DevToolbar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { CallManager, setCallManager } from '$lib/state/call.svelte';
	import { setMockCallManager } from '$lib/state/mock-call.svelte';
	import { toast } from 'svelte-sonner';

	const callId = page.params.callId;

	const callManager = setCallManager(new CallManager(callId));
	const mockCallManager = setMockCallManager();

	let peers = $derived([...callManager.peers.values(), ...(mockCallManager?.peers.values() || [])]);

	$effect(() => {
		if (mockCallManager) {
			for (const peer of mockCallManager.peers.values()) {
				if (peer.peerVideo && peer.remoteStream) {
					peer.peerVideo.srcObject = peer.remoteStream;
				}
			}
		}
	});

	$effect(() => {
		callManager.initialize();
		return () => {
			callManager.cleanup();
			mockCallManager?.cleanup();
		};
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
				<ClientVideoTile />

				{#each peers as peer}
					<PeerVideoTile {peer} />
				{/each}
			</div>

			<CallControls />
		</Card.Content>
	</Card.Root>

	<Button variant="secondary" class="mx-auto w-fit max-w-xs" onclick={handleCopyInviteLink}>
		Copy invite link
	</Button>
</div>

<DevToolbar />
