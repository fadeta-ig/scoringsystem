import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number.parseInt(process.env.PORT || "1312", 10);

const app = next({
  dev,
  hostname,
  port,
  conf: {
    distDir: dev ? ".next-dev" : ".next",
  },
});
const handler = app.getRequestHandler();
const defaultOrigin = `http://${hostname}:${port}`;
const allowedOrigins = new Set(
  (process.env.SOCKET_IO_ORIGINS || process.env.NEXTAUTH_URL || defaultOrigin)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

allowedOrigins.add(defaultOrigin);

await app.prepare();

const httpServer = createServer((request, response) => {
  handler(request, response);
});

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin tidak diizinkan oleh Socket.IO CORS."));
    },
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

globalThis.__scoreboardIo = io;

io.on("connection", (socket) => {
  socket.join("event:active");
  socket.emit("connection.ready", {
    socketId: socket.id,
    recovered: socket.recovered,
  });
});

httpServer.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
