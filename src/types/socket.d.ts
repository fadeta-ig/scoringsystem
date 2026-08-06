import type { Server } from "socket.io";

declare global {
  // Socket.IO lives in server.mjs and is reused by Next server actions.
  var __scoreboardIo: Server | undefined;
}

export {};
