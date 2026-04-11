import { Server } from "socket.io";
import { createServer } from "http";

const PORT = Number(process.env.SOCKETIO_PORT || 3010);
const BROADCAST_SECRET =
  process.env.SOCKETIO_BROADCAST_SECRET || "dev-broadcast-secret";

const httpServer = createServer((req, res) => {
  // Simple HTTP endpoint for broadcasting events from Next.js API routes
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

  socket.on("disconnect", () => {
    console.log(`[SOS-SOCKET] Disconnect: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[SOS-SOCKET] Listening on port ${PORT}`);
});
