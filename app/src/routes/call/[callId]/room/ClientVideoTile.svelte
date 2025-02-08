<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCallManager } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';
	import { GripHorizontal } from 'lucide-svelte';
	import { Spring } from 'svelte/motion';

	let { isPipMode = $bindable(false) } = $props();

	let position = new Spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.1,
			damping: 0.25
		}
	);

	let width = $state(192); // Starting width
	let height = $state(108); // 16:9 aspect ratio
	let dragStart = $state<{ x: number; y: number; startX: number; startY: number } | null>(null);
	let resizeStart = $state<{ startX: number; initialWidth: number } | null>(null);
	let isDragging = $state(false);
	let isResizing = $state(false);
	let transformOrigin = $state('top left');

	const MIN_WIDTH = 192; // Minimum width in pixels
	const MAX_WIDTH = 800; // Maximum width in pixels

	function onDragStart(event: MouseEvent) {
		if (!isPipMode || isResizing) return;
		isDragging = true;
		dragStart = {
			x: position.current.x,
			y: position.current.y,
			startX: event.clientX,
			startY: event.clientY
		};
	}

	function onDragMove(event: MouseEvent) {
		if (!isDragging || !dragStart || isResizing) return;

		position.set({
			x: dragStart.x + (event.clientX - dragStart.startX),
			y: dragStart.y + (event.clientY - dragStart.startY)
		});
	}

	function onDragEnd() {
		isDragging = false;
		dragStart = null;
	}

	$inspect('transformOrigin', transformOrigin);

	function startResize(event: MouseEvent) {
		isResizing = true;
		event.stopPropagation(); // Prevent dragging when resizing

		resizeStart = {
			startX: event.clientX,
			initialWidth: width
		};
	}

	function onResize(event: MouseEvent) {
		if (!resizeStart) return;

		const aspectRatio = 16 / 9;
		let newWidth = $state.snapshot(width);
		let delta = 0;

		delta = event.clientX - resizeStart.startX;
		newWidth = resizeStart.initialWidth - delta;

		// Apply size constraints
		if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
			width = newWidth;
			height = newWidth / aspectRatio;
		}
	}

	function stopResize() {
		isResizing = false;
		resizeStart = null;
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

	$effect(() => {
		if (resizeStart) {
			window.addEventListener('mousemove', onResize);
			window.addEventListener('mouseup', stopResize);

			return () => {
				window.removeEventListener('mousemove', onResize);
				window.removeEventListener('mouseup', stopResize);
			};
		}
	});

	const callManager = getCallManager();
</script>

<svelte:window
	on:mouseleave={() => {
		onDragEnd();
		stopResize();
	}}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'group relative cursor-grab overflow-hidden rounded-lg bg-gray-800',
		isPipMode && 'absolute bottom-4 right-4 z-50',
		!isPipMode && 'h-full w-full',
		isDragging && 'cursor-grabbing'
	)}
	style={isPipMode
		? `transform: translate3d(${position.current.x}px, ${position.current.y}px, 0); width: ${width}px; height: ${height}px;`
		: ''}
	onmousedown={onDragStart}
>
	<video
		bind:this={callManager.mediaState.localVideo}
		autoplay
		playsinline
		muted
		class="h-full w-full object-cover"
	></video>

	<div
		class={cn(
			'absolute bottom-4 left-4 select-none rounded bg-gray-900/80 px-2 py-1 text-sm text-white',
			isPipMode && 'opacity-0'
		)}
	>
		You
	</div>

	{#if isPipMode}
		<!-- Left resize handles -->
		<Button
			variant="ghost"
			size="icon"
			class={cn(
				'top absolute left-0 top-0 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100',
				isResizing && 'opacity-100'
			)}
			onmousedown={(e) => startResize(e)}
		>
			<GripHorizontal class="size-8" />
		</Button>
	{/if}
</div>
