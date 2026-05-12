// Fire-and-forget hook into the Socket.IO server (sockets/sos-server.ts)
// so a peer-message INSERT pushes immediately to all subscribers of the
// conversation room. The server exposes a /broadcast endpoint guarded by
// SOCKETIO_BROADCAST_SECRET — same pattern SOS uses.
//
// If the WS server is down or the secret isn't configured this no-ops;
// clients fall back to their 10s message poll.

const PORT = process.env.SOCKETIO_PORT || "3010";
const SECRET = process.env.SOCKETIO_BROADCAST_SECRET || "dev-broadcast-secret";

export async function broadcastPeerMessage(
  conversationId: string,
  event: "message:new" | "message:updated" | "message:deleted",
  payload: unknown,
) {
  try {
    await fetch(`http://127.0.0.1:${PORT}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify({
        room: `peer-conv:${conversationId}`,
        event,
        payload,
      }),
      // Don't block the route on a slow socket server.
      signal: AbortSignal.timeout(800),
    });
  } catch {
    /* socket server offline — clients keep their poll fallback */
  }
}
