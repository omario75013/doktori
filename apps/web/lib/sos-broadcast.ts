const SOCKETIO_URL =
  process.env.SOCKETIO_INTERNAL_URL || "http://localhost:3010";
const SECRET =
  process.env.SOCKETIO_BROADCAST_SECRET || "dev-broadcast-secret";

export async function broadcastSos(
  room: string,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    await fetch(`${SOCKETIO_URL}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify({ room, event, payload }),
    });
  } catch (e) {
    // Socket.io may be down — polling still works as fallback
    console.error("[SOS-BROADCAST] broadcast failed:", e);
  }
}
