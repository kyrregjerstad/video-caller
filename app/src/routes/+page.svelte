<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input/input.svelte';

	let callId = $state('');

	function startNewCall() {
		console.log('Starting a new call');
	}

	function joinCall() {
		console.log('Joining call with ID:', callId);
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Video Call</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="space-y-6">
				<Button
					onclick={startNewCall}
					class="w-full rounded-lg bg-gray-800 px-4 py-3 font-semibold text-gray-100 shadow-md transition-all duration-300 ease-in-out hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-50"
				>
					Start a New Call
				</Button>

				<div class="relative">
					<Input placeholder="Enter Call ID" bind:value={callId} />
					<Button
						onclick={joinCall}
						class="absolute right-0 top-1/2 -translate-y-1/2"
						variant="secondary">Join</Button
					>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
