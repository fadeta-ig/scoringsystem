import { NextResponse } from "next/server";
import { getPublicLiveState } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getPublicLiveState();
  return NextResponse.json(state);
}
