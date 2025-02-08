<script lang="ts">
	import { type Peer } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';

	let { peer }: { peer: Peer } = $props();
</script>

<div class="relative h-full w-full overflow-hidden rounded-lg bg-gray-800">
	<!-- svelte-ignore a11y_media_has_caption -->
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<video
		bind:this={peer.peerVideo}
		autoplay
		playsinline
		class={cn(
			'h-full w-full object-cover',
			peer.callState === 'connected' && 'opacity-100',
			peer.callState === 'connecting' && 'opacity-50',
			peer.callState === 'disconnected' && 'opacity-0'
		)}
	/>
	<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
		Participant {peer.id.slice(0, 4)}
	</div>
</div>
