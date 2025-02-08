<script lang="ts">
	import { getCallManager } from '$lib/state/call.svelte';

	const callManager = getCallManager();
</script>

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
