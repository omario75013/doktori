import { Server } from "socket.io";
import { createServer } from "http";

const PORT = Number(process.env.SOCKETIO_PORT || 3010);
const BROADCAST_SECRET =
  process.env.SOCKETIO_BROADCAST_SECRET || "dev-broadcast-secret";

const httpServer = createServer((req, res) => {
  // CORS preflight + permissive headers so the API route (and dev probes)
  // can hit /broadcast from a browser origin without a 403/blocked.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }
  if (req.method === "POST" && req.url === "/broadcast") {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${BROADCAST_SECRET}`) {
      res.writeHead(401).end();
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { room, event, payload } = JSON.parse(body) as {
          room: string;
          event: string;
          payload: unknown;
        };
        io.to(room).emit(event, payload);
        const size = io.sockets.adapter.rooms.get(room)?.size ?? 0;
        console.log(`[SOS-SOCKET] broadcast → ${room} (${event}) to ${size} client(s)`);
        res
          .writeHead(200, { "Content-Type": "application/json" })
          .end('{"ok":true}');
      } catch {
        res.writeHead(400).end();
      }
    });
    return;
  }
  res.writeHead(404).end();
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
  path: "/sos-socket",
});

io.on("connection", (socket) => {
  console.log(`[SOS-SOCKET] Connection: ${socket.id}`);

  socket.on("join-session", (sessionId: string) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on("join-doctor-feed", (_doctorId: string) => {
    // All doctors join the shared "doctors-all" room for new-request broadcasts
    socket.join("doctors-all");
  });

  // Peer-doctor chat — one room per conversation. The HTTP /broadcast
  // endpoint emits "message:new", "message:updated", "message:deleted"
  // into peer-conv:<conversationId> after the DB write.
  socket.on("join-peer-conv", (conversationId: string) => {
    if (typeof conversationId === "string" && conversationId.length > 0) {
      socket.join(`peer-conv:${conversationId}`);
      console.log(`[SOS-SOCKET] ${socket.id} joined peer-conv:${conversationId}`);
    }
  });
  socket.on("leave-peer-conv", (conversationId: string) => {
    if (typeof conversationId === "string" && conversationId.length > 0) {
      socket.leave(`peer-conv:${conversationId}`);
      console.log(`[SOS-SOCKET] ${socket.id} left peer-conv:${conversationId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SOS-SOCKET] Disconnect: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[SOS-SOCKET] Listening on port ${PORT}`);
});
