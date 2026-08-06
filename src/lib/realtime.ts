import { getPublicLiveState } from "@/lib/live-state";

export async function emitLiveState(eventId?: string | null) {
  const state = await getPublicLiveState(eventId);
  const io = globalThis.__scoreboardIo;

  if (!io || !state) {
    return;
  }

  io.to("event:active").emit("live-state", state);
}
