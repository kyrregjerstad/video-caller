import { browser } from '$app/environment';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';

class MockParticipant {
	peerVideo = $state<HTMLVideoElement | null>(null);
	remoteStream = $state<MediaStream | null>(null);
	callState = $state<'connecting' | 'connected' | 'disconnected'>('connecting');

	constructor(id: string) {
		// Create a mock video stream with a colored canvas
		const canvas = document.createElement('canvas');
		canvas.width = 640;
		canvas.height = 480;
		const ctx = canvas.getContext('2d')!;

		// Generate a random color for this participant
		const hue = Math.random() * 360;
		ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Add participant ID text
		ctx.fillStyle = 'white';
		ctx.font = '48px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(`Mock Participant ${id}`, canvas.width / 2, canvas.height / 2);

		// Create a stream from the canvas
		this.remoteStream = canvas.captureStream();

		// Simulate connection delay
		setTimeout(() => {
			this.callState = 'connected';
		}, 1000);
	}

	cleanup() {
		if (this.peerVideo) {
			this.peerVideo.srcObject = null;
		}
		if (this.remoteStream) {
			this.remoteStream.getTracks().forEach((track) => track.stop());
		}
	}
}

export class MockCallManager {
	peers = new SvelteMap<string, MockParticipant>();
	isDevMode = browser && import.meta.env.DEV;

	addMockParticipant() {
		if (!this.isDevMode) return;
		const id = Math.random().toString(36).substring(7);
		const participant = new MockParticipant(id);
		this.peers.set(id, participant);

		console.log('Added mock participant', id);
		console.log(this.peers);
	}

	removeMockParticipant(id: string) {
		if (!this.isDevMode) return;
		const participant = this.peers.get(id);
		if (participant) {
			participant.cleanup();
			this.peers.delete(id);
		}
	}

	removeAllMockParticipants() {
		if (!this.isDevMode) return;
		for (const [id, participant] of this.peers) {
			participant.cleanup();
			this.peers.delete(id);
		}
	}

	cleanup() {
		this.removeAllMockParticipants();
	}
}

const MOCK_CALL_KEY = Symbol('MOCK_CALL');

export function setMockCallManager() {
	if (browser && import.meta.env.DEV) {
		return setContext(MOCK_CALL_KEY, new MockCallManager());
	}
	return null;
}

export function getMockCallManager() {
	return getContext<MockCallManager | null>(MOCK_CALL_KEY);
}
