import { getContext, setContext } from 'svelte';
import { goto } from '$app/navigation';
import {
	PUBLIC_STUN_SERVER,
	PUBLIC_TURN_SERVER_URL,
	PUBLIC_TURN_SERVER_USERNAME,
	PUBLIC_TURN_SERVER_PASSWORD,
	PUBLIC_WS_URL
} from '$env/static/public';

const CALL_STATE_KEY = Symbol('CALL_STATE');

type CallState = 'connecting' | 'connected' | 'disconnected' | 'ended';

type WebSocketMessage = {
	type: 'joined' | 'candidate' | 'offer' | 'answer' | 'left';
	candidate?: RTCIceCandidate;
	offer?: RTCSessionDescriptionInit;
	answer?: RTCSessionDescriptionInit;
};

const iceServers = import.meta.env.PROD
	? [
			{
				urls: [`${PUBLIC_STUN_SERVER}:3478`]
			},
			{
				urls: [`${PUBLIC_TURN_SERVER_URL}:3478?transport=udp`],
				username: PUBLIC_TURN_SERVER_USERNAME,
				credential: PUBLIC_TURN_SERVER_PASSWORD
			},
			{
				urls: [`${PUBLIC_TURN_SERVER_URL}:3478?transport=tcp`],
				username: PUBLIC_TURN_SERVER_USERNAME,
				credential: PUBLIC_TURN_SERVER_PASSWORD
			},
			{
				urls: [`${PUBLIC_TURN_SERVER_URL}:5349?transport=tcp`],
				username: PUBLIC_TURN_SERVER_USERNAME,
				credential: PUBLIC_TURN_SERVER_PASSWORD
			}
		]
	: [
			{
				urls: [`${PUBLIC_STUN_SERVER}:3478`]
			}
		];

export class MediaState {
	localStream = $state<MediaStream | null>(null);
	localVideo = $state<HTMLVideoElement | null>(null);
	mediaError = $state<string | null>(null);
	isAudioEnabled = $state(false);
	isVideoEnabled = $state(true);

	async startLocalPlayback() {
		try {
			const config = {
				video: {
					width: { min: 1280, ideal: 1920 },
					height: { min: 720, ideal: 1080 }
				},
				audio: true
			};

			this.mediaError = null;
			this.localStream = await navigator.mediaDevices.getUserMedia(config);

			// Set initial states based on tracks
			this.isVideoEnabled = this.localStream.getVideoTracks().some((track) => track.enabled);
			this.isAudioEnabled = this.localStream.getAudioTracks().some((track) => track.enabled);

			if (this.localVideo) {
				this.localVideo.srcObject = this.localStream;
			}
		} catch (error) {
			console.error('Error accessing media devices:', error);
			if (error instanceof DOMException) {
				switch (error.name) {
					case 'NotAllowedError':
						this.mediaError =
							'Camera/microphone access was denied. Please grant permission and try again.';
						break;
					case 'NotFoundError':
						this.mediaError = 'No camera or microphone found. Please check your devices.';
						break;
					case 'NotReadableError':
						this.mediaError =
							'Could not access your devices. They might be in use by another application.';
						break;
					default:
						this.mediaError = `Could not access media devices: ${error.message}`;
				}
			} else {
				this.mediaError = 'An unexpected error occurred while accessing media devices.';
			}
			throw error;
		}
	}

	toggleAudio() {
		if (this.localStream) {
			const audioTracks = this.localStream.getAudioTracks();
			audioTracks.forEach((track) => {
				track.enabled = !track.enabled;
			});
			this.isAudioEnabled = audioTracks.some((track) => track.enabled);
		}
	}

	toggleVideo() {
		if (this.localStream) {
			const videoTracks = this.localStream.getVideoTracks();
			videoTracks.forEach((track) => {
				track.enabled = !track.enabled;
			});
			this.isVideoEnabled = videoTracks.some((track) => track.enabled);
		}
	}

	cleanup() {
		if (this.localStream) {
			this.localStream.getTracks().forEach((track) => track.stop());
		}
	}
}

export class PeerState {
	connection = $state<RTCPeerConnection | null>(null);
	remoteStream = $state<MediaStream | null>(null);
	peerVideo = $state<HTMLVideoElement | null>(null);
	callState = $state<CallState>('connecting');

	constructor(
		private mediaState: MediaState,
		private iceServers: RTCIceServer[],
		private wsSend: (data: WebSocketMessage) => void
	) {}

	async connectToPeer() {
		this.connection = new RTCPeerConnection({ iceServers: this.iceServers });
		this.remoteStream = new MediaStream();

		if (this.peerVideo) {
			this.peerVideo.srcObject = this.remoteStream;
		}

		if (!this.mediaState.localStream) {
			await this.mediaState.startLocalPlayback();
		}

		this.mediaState.localStream!.getTracks().forEach((track) => {
			this.connection!.addTrack(track, this.mediaState.localStream!);
		});

		this.connection.ontrack = (event) => {
			event.streams[0].getTracks().forEach((track) => {
				this.remoteStream!.addTrack(track);
			});
		};

		this.connection.onicecandidate = (event) => {
			if (event.candidate) {
				this.wsSend({ type: 'candidate', candidate: event.candidate });
			}
		};
	}

	async makeCall() {
		await this.connectToPeer();
		if (!this.connection) return;

		const offer = await this.connection.createOffer();
		await this.connection.setLocalDescription(offer);
		this.wsSend({ type: 'offer', offer });
		this.callState = 'connected';
	}

	async acceptCandidate(candidate: RTCIceCandidate) {
		if (!this.connection) return;
		try {
			await this.connection.addIceCandidate(candidate);
		} catch (error) {
			console.error('Error adding ice candidate:', error);
		}
		this.callState = 'connected';
	}

	async answerCall(offer: RTCSessionDescriptionInit) {
		await this.connectToPeer();
		if (!this.connection) return;
		await this.connection.setRemoteDescription(offer);
		const answer = await this.connection.createAnswer();
		await this.connection.setLocalDescription(answer);
		this.wsSend({ type: 'answer', answer });
		this.callState = 'connected';
	}

	async startCall(answer: RTCSessionDescriptionInit) {
		if (!this.connection) return;
		await this.connection.setRemoteDescription(answer);
		this.callState = 'connected';
	}

	async endCall() {
		if (!this.connection) return;
		this.connection.close();
		this.connection = null;
		this.callState = 'disconnected';
	}
}

export class CallManager {
	ws = $state<WebSocket | null>(null);
	mediaState = new MediaState();
	peerState: PeerState;
	wsUrl = PUBLIC_WS_URL;

	constructor(private callId: string) {
		this.peerState = new PeerState(this.mediaState, iceServers, this.wsSend.bind(this));
	}

	private wsSend(data: WebSocketMessage) {
		if (this.ws) {
			this.ws.send(JSON.stringify(data));
		}
	}

	async handleMessages(event: MessageEvent) {
		const message = JSON.parse(event.data);
		console.log(message);

		switch (message.type) {
			case 'joined':
				await this.peerState.makeCall();
				break;
			case 'candidate':
				await this.peerState.acceptCandidate(message.candidate);
				break;
			case 'offer':
				await this.peerState.answerCall(message.offer);
				break;
			case 'answer':
				await this.peerState.startCall(message.answer);
				break;
			case 'left':
				await this.peerState.endCall();
				break;
			default:
				console.error('Unknown message type:', message.type);
				this.peerState.callState = 'disconnected';
		}
	}

	async initialize() {
		try {
			await this.mediaState.startLocalPlayback();

			this.ws = new WebSocket(`${this.wsUrl}/${this.callId}`);
			this.ws.onmessage = (e) => this.handleMessages(e);
			this.ws.onopen = () => this.wsSend({ type: 'joined' });
		} catch (error) {
			console.error('Error initializing call:', error);
		}
	}

	cleanup() {
		this.mediaState.cleanup();
		if (this.ws) {
			this.ws.close();
		}
	}

	clientEndCall() {
		this.peerState.endCall();
		goto(`/call/${this.callId}/finished`);
	}
}

export function setCallManager(callManager: CallManager) {
	return setContext(CALL_STATE_KEY, callManager);
}

export function getCallManager() {
	return getContext<CallManager>(CALL_STATE_KEY);
}
