<script lang="ts">
	import { type Peer } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';
	import { WifiOff } from 'lucide-svelte';

	let { peer }: { peer: Peer } = $props();
	let videoElement = $state<HTMLVideoElement | null>(null);

	$effect(() => {
		if (videoElement && peer.remoteStream) {
			videoElement.srcObject = peer.remoteStream;
			peer.peerVideo = videoElement;
		}
	});
</script>

<div
	class="relative h-full w-full overflow-hidden rounded-lg bg-gray-800"
	transition:fly={{ duration: 300, y: 100, delay: 300, easing: cubicOut }}
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoElement}
		autoplay
		playsinline
		class={cn(
			'h-full w-full object-cover',
			peer.callState === 'connected' && 'opacity-100',
			peer.callState === 'connecting' && 'opacity-50',
			(peer.callState === 'disconnected' || peer.callState === 'ended') && 'opacity-25'
		)}
	></video>

	{#if peer.callState === 'disconnected' || peer.callState === 'ended'}
		<div
			class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/50 text-white"
		>
			<WifiOff class="size-8" />
			<p class="text-sm">Participant disconnected</p>
		</div>
	{/if}

	<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
		Participant {peer.id.slice(0, 4)}
	</div>
</div>
