import { ProjectorStage } from "@/components/projector/projector-stage";
import { getPublicLiveState } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  const state = await getPublicLiveState();

  return <ProjectorStage initialState={state} />;
}
