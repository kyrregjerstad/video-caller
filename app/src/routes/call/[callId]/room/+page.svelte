<script lang="ts">
	import { page } from '$app/state';
	import DevToolbar from '$lib/components/DevToolbar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { setCallManager } from '$lib/state/call.svelte';
	import { setMockCallManager } from '$lib/state/mock-call.svelte';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import CallControls from './CallControls.svelte';
	import ClientVideoTile from './ClientVideoTile.svelte';
	import PeerVideoTile from './PeerVideoTile.svelte';

	const callId = page.params.callId;

	const callManager = setCallManager(callId);
	const mockCallManager = setMockCallManager();

	let peers = $derived([...callManager.peers.values(), ...(mockCallManager?.peers.values() || [])]);
	let isPipMode = $derived(peers.length > 0);

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
			<div class="relative h-[calc(100vh-16rem)] w-full">
				{#if peers.length > 0}
					<div
						class="grid h-full w-full gap-4"
						class:grid-cols-2={peers.length === 1}
						class:grid-cols-3={peers.length >= 2}
						in:fly={{ y: 20, duration: 300, easing: cubicOut }}
					>
						{#each peers as peer}
							<PeerVideoTile {peer} />
						{/each}
					</div>
				{/if}

				<ClientVideoTile {isPipMode} />
			</div>

			<CallControls />
		</Card.Content>
	</Card.Root>

	<Button variant="secondary" class="mx-auto w-fit max-w-xs" onclick={handleCopyInviteLink}>
		Copy invite link
	</Button>
</div>

<DevToolbar />
