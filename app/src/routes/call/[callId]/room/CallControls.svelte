<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCallManager } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';
	import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from 'lucide-svelte';

	const callManager = getCallManager();
</script>

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
