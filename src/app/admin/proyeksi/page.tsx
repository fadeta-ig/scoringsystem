import { ProjectionControlRoom } from "@/components/admin/projection-control-room";
import { getLiveState } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export default async function ProjectionControlPage() {
  const state = await getLiveState();

  if (!state) {
    return null;
  }

  return <ProjectionControlRoom initialState={state} />;
}
