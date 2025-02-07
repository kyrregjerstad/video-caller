import { DurableObject } from 'cloudflare:workers';

export class VideoCallRoom extends DurableObject<Env> {
	participants: Map<WebSocket, { id: string | null }>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		this.participants = new Map();
		this.ctx.getWebSockets().forEach((connection) => {
			this.participants.set(connection, { ...connection.deserializeAttachment() });
		});
	}

	async fetch(request: Request) {
		const webSocketPair = new WebSocketPair();
		const clientSocket = webSocketPair[0];
		const serverSocket = webSocketPair[1];
		this.ctx.acceptWebSocket(serverSocket);
		this.participants.set(serverSocket, { id: null });
		return new Response(null, { status: 101, webSocket: clientSocket });
	}

	webSocketMessage(connection: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
		const participant = this.participants.get(connection);

		if (!participant) {
			this.disconnectParticipant(connection);
			return;
		}

		if (!participant.id) {
			participant.id = crypto.randomUUID();
			connection.serializeAttachment({ ...connection.deserializeAttachment(), id: participant.id });
			connection.send(JSON.stringify({ ready: true, id: participant.id }));

			// Broadcast to others that a new participant joined
			this.broadcastToRoom(connection, JSON.stringify({ type: 'participant_joined', id: participant.id }));
		}

		this.broadcastToRoom(connection, message);
	}

	broadcastToRoom(sender: WebSocket, message: string | ArrayBuffer): void {
		const senderId = this.participants.get(sender)?.id;

		for (const [connection] of this.participants.entries()) {
			if (connection === sender) continue;

			if (typeof message === 'string') {
				connection.send(JSON.stringify({ ...JSON.parse(message), id: senderId }));
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

		this.broadcastToRoom(connection, JSON.stringify({ type: 'close', id: participant.id }));
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
