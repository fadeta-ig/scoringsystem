"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { io } from "socket.io-client";
import { Badge } from "@/components/ui/badge";

export function LiveStatusPill() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <Badge
      className={
        connected
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }
    >
      {connected ? (
        <Wifi size={14} />
      ) : (
        <WifiOff size={14} />
      )}
      {connected ? "Realtime tersambung" : "Menyambung realtime"}
    </Badge>
  );
}
