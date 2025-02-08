<script lang="ts">
	import { getCallManager } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';

	let { isPipMode = $bindable(false) } = $props();

	let position = $state({ x: 0, y: 0 });
	let dragStart = $state<{ x: number; y: number; startX: number; startY: number } | null>(null);
	let isDragging = $state(false);

	function onDragStart(event: MouseEvent) {
		if (!isPipMode) return;
		isDragging = true;
		dragStart = {
			x: position.x,
			y: position.y,
			startX: event.clientX,
			startY: event.clientY
		};
	}

	function onDragMove(event: MouseEvent) {
		if (!isDragging || !dragStart) return;

		// Calculate new position based on drag offset
		position = {
			x: dragStart.x + (event.clientX - dragStart.startX),
			y: dragStart.y + (event.clientY - dragStart.startY)
		};
	}

	function onDragEnd() {
		isDragging = false;
		dragStart = null;
	}

	$effect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', onDragMove);
			window.addEventListener('mouseup', onDragEnd);

			return () => {
				window.removeEventListener('mousemove', onDragMove);
				window.removeEventListener('mouseup', onDragEnd);
			};
		}
	});

	const callManager = getCallManager();
</script>

<svelte:window on:mouseleave={onDragEnd} />

<button
	class={cn(
		'relative overflow-hidden rounded-lg bg-gray-800 transition-all duration-300',
		isPipMode && 'absolute bottom-4 right-4 z-50 w-48 hover:w-96',
		!isPipMode && 'h-full w-full',
		isDragging && 'cursor-grabbing transition-none',
		isPipMode && !isDragging && 'cursor-grab'
	)}
	style={isPipMode ? `transform: translate3d(${position.x}px, ${position.y}px, 0)` : ''}
	onmousedown={onDragStart}
>
	<video
		bind:this={callManager.mediaState.localVideo}
		autoplay
		playsinline
		muted
		class="h-full w-full object-cover"
	></video>
	<div class="absolute bottom-4 left-4 rounded bg-gray-900/80 px-2 py-1 text-sm text-white">
		You
	</div>
</button>
