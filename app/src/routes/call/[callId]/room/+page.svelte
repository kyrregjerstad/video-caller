<script lang="ts">
	import { page } from '$app/state';
	import DevToolbar from '$lib/components/DevToolbar.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { setCallManager } from '$lib/state/call.svelte';
	import { setMockCallManager } from '$lib/state/mock-call.svelte';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import CallControls from './CallControls.svelte';
	import ClientVideoTile from './ClientVideoTile.svelte';
	import PeerVideoTile from './PeerVideoTile.svelte';

	const GRID_COLS = {
		0: 'grid-cols-1',
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-2',
		5: 'grid-cols-3',
		6: 'grid-cols-3',
		7: 'grid-cols-4',
		8: 'grid-cols-4',
		9: 'grid-cols-4',
		10: 'grid-cols-5'
	} as const;

	function getGridCols(peerCount: number) {
		const breakpoints = Object.keys(GRID_COLS)
			.map(Number)
			.sort((a, b) => a - b);

		for (const breakpoint of breakpoints) {
			if (peerCount <= breakpoint) {
				return GRID_COLS[breakpoint as keyof typeof GRID_COLS];
			}
		}

		return GRID_COLS[10];
	}

	const callId = page.params.callId;
	const debugMode = page.url.searchParams.get('debug') === 'true';

	const callManager = setCallManager(callId);
	const mockCallManager = setMockCallManager();

	let participantsToDisplay = $derived.by(() => {
		const allPeers = [...callManager.peers.values(), ...(mockCallManager?.peers.values() || [])];
		return allPeers;
	});

	$effect(() => {
		// Ensure video streams are bound for all peers
		for (const peer of participantsToDisplay) {
			if (peer.peerVideo && peer.remoteStream) {
				peer.peerVideo.srcObject = peer.remoteStream;
			}
		}
	});

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
			<div class="relative h-[calc(100dvh-16rem)] w-full">
				<div
					class={cn(
						'grid h-full w-full gap-4',
						getGridCols(
							callManager.shouldShowPip
								? participantsToDisplay.length
								: participantsToDisplay.length + 1
						)
					)}
				>
					{#each participantsToDisplay as peer (peer.id)}
						<span class=" min-h-0" animate:flip={{ duration: 500, easing: cubicOut }}>
							<PeerVideoTile {peer} />
						</span>
					{/each}

					<span class=" min-h-0">
						<ClientVideoTile />
					</span>
				</div>
			</div>
			<CallControls />
		</Card.Content>
	</Card.Root>

	<Button variant="secondary" class="mx-auto w-fit max-w-xs" onclick={handleCopyInviteLink}>
		Copy invite link
	</Button>
</div>

{#if debugMode}
	<DevToolbar />
{/if}
