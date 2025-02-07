import { DurableObject } from 'cloudflare:workers';

export class VideoCallRoom extends DurableObject<Env> {
	sessions: Map<WebSocket, { id: string | null }>;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		this.sessions = new Map();
		this.ctx.getWebSockets().forEach((ws) => {
			this.sessions.set(ws, { ...ws.deserializeAttachment() });
		});
	}

	async fetch(_request: Request) {
		const webSocketPair = new WebSocketPair();
		const clientSocket = webSocketPair[0];
		const serverSocket = webSocketPair[1];
		this.ctx.acceptWebSocket(serverSocket);
		this.sessions.set(serverSocket, { id: null });
		return new Response(null, { status: 101, webSocket: clientSocket });
	}

	webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
		const session = this.sessions.get(ws);

		if (!session) {
			this.close(ws);
			return;
		}

		if (!session.id) {
			session.id = crypto.randomUUID();
			ws.serializeAttachment({ ...ws.deserializeAttachment(), id: session.id });
			ws.send(JSON.stringify({ ready: true, id: session.id }));
		}

		this.broadcast(ws, message);
	}

	broadcast(sender: WebSocket, message: string | ArrayBuffer): void {
		const id = this.sessions.get(sender)?.id;

		for (const [ws] of this.sessions.entries()) {
			if (ws === sender) continue;

			if (typeof message === 'string') {
				ws.send(JSON.stringify({ ...JSON.parse(message), id }));
			} else {
				ws.send(JSON.stringify({ ...message, id }));
			}
		}
	}

	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		this.close(ws);
	}
	webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
		this.close(ws);
	}

	close(ws: WebSocket): void {
		const session = this.sessions.get(ws);
		if (!session?.id) return;

		this.broadcast(ws, JSON.stringify({ type: 'close', id: session.id }));
		this.sessions.delete(ws);
	}
}

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const upgrade = request.headers.get('Upgrade');
		if (!upgrade || upgrade !== 'websocket') {
			return new Response('Expected Upgrade: websocket', { status: 426 });
		}

		const id = env.VIDEO_CALL_ROOM.idFromName(new URL(request.url).pathname);
		const stub = env.VIDEO_CALL_ROOM.get(id);

		return stub.fetch(request);
	},
} satisfies ExportedHandler<Env>;
