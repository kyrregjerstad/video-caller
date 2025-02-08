import { DurableObject } from 'cloudflare:workers';

export class VideoCallRoom extends DurableObject<Env> {
	participants: Map<WebSocket, { id: string }>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		this.participants = new Map();
		this.ctx.getWebSockets().forEach((connection) => {
			this.participants.set(connection, { ...connection.deserializeAttachment() });
		});
	}

	async fetch(request: Request) {
		const url = new URL(request.url);
		const participantId = url.searchParams.get('participantId');

		if (!participantId) {
			return new Response('Missing participantId', { status: 400 });
		}

		const webSocketPair = new WebSocketPair();
		const clientSocket = webSocketPair[0];
		const serverSocket = webSocketPair[1];
		this.ctx.acceptWebSocket(serverSocket);

		// Store the participant ID immediately
		this.participants.set(serverSocket, { id: participantId });
		serverSocket.serializeAttachment({ id: participantId });

		// Notify others about the reconnection
		this.broadcastToRoom(
			serverSocket,
			JSON.stringify({
				type: 'participant_joined',
				id: participantId,
			}),
		);

		return new Response(null, { status: 101, webSocket: clientSocket });
	}

	webSocketMessage(connection: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
		const participant = this.participants.get(connection);

		if (!participant) {
			this.disconnectParticipant(connection);
			return;
		}

		// Parse the message to get the type
		if (typeof message === 'string') {
			const parsedMessage = JSON.parse(message);

			// Handle join message specially
			if (parsedMessage.type === 'joined') {
				// Send back confirmation with their ID
				connection.send(
					JSON.stringify({
						type: 'joined',
						id: participant.id,
					}),
				);
				return;
			}
		}

		this.broadcastToRoom(connection, message);
	}

	broadcastToRoom(sender: WebSocket, message: string | ArrayBuffer): void {
		const senderId = this.participants.get(sender)?.id;

		for (const [connection, participant] of this.participants.entries()) {
			if (connection === sender) continue;

			if (typeof message === 'string') {
				const parsedMessage = JSON.parse(message);
				connection.send(
					JSON.stringify({
						...parsedMessage,
						id: senderId,
					}),
				);
			} else {
				connection.send(JSON.stringify({ ...message, id: senderId }));
			}
		}
	}

	webSocketClose(connection: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		this.disconnectParticipant(connection);
	}

	webSocketError(connection: WebSocket, error: unknown): void | Promise<void> {
		this.disconnectParticipant(connection);
	}

	disconnectParticipant(connection: WebSocket): void {
		const participant = this.participants.get(connection);
		if (!participant?.id) return;

		this.broadcastToRoom(
			connection,
			JSON.stringify({
				type: 'left',
				id: participant.id,
			}),
		);
		this.participants.delete(connection);
	}
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const upgradeHeader = request.headers.get('Upgrade');
		if (!upgradeHeader || upgradeHeader !== 'websocket') {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		const roomId = env.VIDEO_CALL_ROOM.idFromName(new URL(request.url).pathname);
		const room = env.VIDEO_CALL_ROOM.get(roomId);

		return room.fetch(request);
	},
} satisfies ExportedHandler<Env>;
