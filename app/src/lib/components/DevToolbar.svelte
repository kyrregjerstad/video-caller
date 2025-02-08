<script lang="ts">
	import { browser } from '$app/environment';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Card from '$lib/components/ui/card';
	import { getMockCallManager } from '$lib/state/mock-call.svelte';

	const mockCallManager = getMockCallManager();
	const isDevMode = browser && import.meta.env.DEV;
</script>

{#if isDevMode && mockCallManager}
	<Card.Root class="fixed bottom-4 left-4 z-50 w-80">
		<Card.Header>
			<Card.Title>Development Tools</Card.Title>
			<Card.Description>Add or remove mock participants for testing</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<h3 class="text-sm font-medium">Connected Participants</h3>
				{#if mockCallManager.peers.size === 0}
					<p class="text-muted-foreground text-sm">No mock participants</p>
				{:else}
					<div class="space-y-2">
						{#each [...mockCallManager.peers.entries()] as [id, peer]}
							<div class="flex items-center justify-between rounded-md border p-2">
								<span class="text-sm">Participant {id}</span>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => mockCallManager.removeMockParticipant(id)}
								>
									Remove
								</Button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</Card.Content>
		<Card.Footer>
			<div class="flex flex-wrap gap-2">
				<Button variant="outline" onclick={() => mockCallManager.addMockParticipant()}>
					Add Participant
				</Button>
				<Button variant="destructive" onclick={() => mockCallManager.removeAllMockParticipants()}>
					Remove All
				</Button>
			</div>
		</Card.Footer>
	</Card.Root>
{/if}
