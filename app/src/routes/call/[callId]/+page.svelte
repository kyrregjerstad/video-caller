<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	const callId = $page.params.callId;

	onMount(() => {
		goto(`/call/${callId}/setup`);
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950">
	<div class="text-white">Redirecting to call setup...</div>
</div>
