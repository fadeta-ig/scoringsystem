import type { LiveState } from "@/lib/live-state";

function stateTime(value: LiveState) {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value.generatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function shouldApplyLiveState(current: LiveState, next: LiveState) {
  if (!next) {
    return !current;
  }

  if (!current) {
    return true;
  }

  return stateTime(next) >= stateTime(current);
}
