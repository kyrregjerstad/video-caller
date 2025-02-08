<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { getCallManager } from '$lib/state/call.svelte';
	import { cn } from '$lib/utils';
	import { GripHorizontal } from 'lucide-svelte';
	import type { Action } from 'svelte/action';
	import { Spring } from 'svelte/motion';

	const callManager = getCallManager();

	let isPipMode = $derived(callManager.isPipModeEnabled);

	let position = new Spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.1,
			damping: 0.25
		}
	);
	const MIN_WIDTH = 192; // Minimum width in pixels
	const MAX_WIDTH = 800; // Maximum width in pixels
	const ASPECT_RATIO = 16 / 9;

	let width = $state(256);
	let height = $derived(width / ASPECT_RATIO);

	let isDragging = $state(false);
	let isResizing = $state(false);

	const TRANSITION_DURATION = '300ms';
	const TRANSITION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

	$effect(() => {
		return () => {
			callManager.mediaState.cleanup();
		};
	});

	interface DraggableParams {
		onDrag?: (x: number, y: number) => void;
	}

	const draggable: Action<HTMLElement, DraggableParams> = (node, params) => {
		let dragStart: { x: number; y: number; startX: number; startY: number } | null = null;

		function onDragStart(event: MouseEvent) {
			if (isResizing) return;
			isDragging = true;
			dragStart = {
				x: position.current.x,
				y: position.current.y,
				startX: event.clientX,
				startY: event.clientY
			};

			window.addEventListener('mousemove', onDragMove);
			window.addEventListener('mouseup', onDragEnd);
		}

		function onDragMove(event: MouseEvent) {
			if (!isDragging || !dragStart || isResizing) return;

			const x = dragStart.x + (event.clientX - dragStart.startX);
			const y = dragStart.y + (event.clientY - dragStart.startY);

			params?.onDrag?.(x, y);
		}

		function onDragEnd() {
			isDragging = false;
			dragStart = null;
			window.removeEventListener('mousemove', onDragMove);
			window.removeEventListener('mouseup', onDragEnd);
		}

		function cleanup() {
			window.removeEventListener('mousemove', onDragMove);
			window.removeEventListener('mouseup', onDragEnd);
		}

		node.addEventListener('mousedown', onDragStart);

		return {
			destroy() {
				node.removeEventListener('mousedown', onDragStart);
				cleanup();
			},
			update(newParams: DraggableParams) {
				params = newParams;
			}
		};
	};

	interface ResizableParams {
		onResize?: (width: number) => void;
	}

	const resizable: Action<HTMLElement, ResizableParams> = (node, params) => {
		let resizeStart: { startX: number; initialWidth: number } | null = null;

		function onResizeStart(event: MouseEvent) {
			isResizing = true;
			event.stopPropagation();

			resizeStart = {
				startX: event.clientX,
				initialWidth: width
			};

			window.addEventListener('mousemove', onResizeMove);
			window.addEventListener('mouseup', onResizeEnd);
		}

		function onResizeMove(event: MouseEvent) {
			if (!resizeStart) return;

			let newWidth = $state.snapshot(width);
			const delta = event.clientX - resizeStart.startX;
			newWidth = resizeStart.initialWidth - delta;

			if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
				params?.onResize?.(newWidth);
			}
		}

		function onResizeEnd() {
			isResizing = false;
			resizeStart = null;
			window.removeEventListener('mousemove', onResizeMove);
			window.removeEventListener('mouseup', onResizeEnd);
		}

		function cleanup() {
			window.removeEventListener('mousemove', onResizeMove);
			window.removeEventListener('mouseup', onResizeEnd);
		}

		node.addEventListener('mousedown', onResizeStart);

		return {
			destroy() {
				node.removeEventListener('mousedown', onResizeStart);
				cleanup();
			},
			update(newParams: ResizableParams) {
				params = newParams;
			}
		};
	};
</script>

<svelte:window
	onmouseleave={() => {
		isDragging = false;
		isResizing = false;
	}}
/>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class={cn(
		'group relative cursor-grab overflow-hidden rounded-lg bg-gray-500',
		isPipMode && 'absolute bottom-4 right-4 z-50',
		!isPipMode && 'h-full w-full',
		isDragging && 'cursor-grabbing'
	)}
	style={isPipMode
		? `transform: translate3d(${position.current.x}px, ${position.current.y}px, 0); width: ${width}px; height: ${height}px;${!isDragging && !isResizing ? ` transition: transform ${TRANSITION_DURATION} ${TRANSITION_EASING}, width ${TRANSITION_DURATION} ${TRANSITION_EASING}, height ${TRANSITION_DURATION} ${TRANSITION_EASING};` : ''}`
		: !isDragging && !isResizing
			? `transition: width ${TRANSITION_DURATION} ${TRANSITION_EASING}, height ${TRANSITION_DURATION} ${TRANSITION_EASING};`
			: ''}
	use:draggable={{
		onDrag: (x, y) => position.set({ x, y })
	}}
	ondblclick={() => {
		callManager.togglePipMode();
	}}
>
	<video
		bind:this={callManager.mediaState.localVideo}
		autoplay
		playsinline
		muted
		class="h-full w-full -scale-x-100 object-cover"
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
		<div
			use:resizable={{
				onResize: (w) => (width = w)
			}}
			class="absolute left-0 top-0"
		>
			<Button
				variant="ghost"
				size="icon"
				class={cn(
					'opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100',
					isResizing && 'opacity-100'
				)}
			>
				<GripHorizontal class="size-8" />
			</Button>
		</div>
	{/if}
</div>
