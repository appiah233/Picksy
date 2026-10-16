import type { ProjectState } from "./coordinator.ts";
import { redactForMonitor } from "./redaction.ts";

export interface MonitorSnapshot {
  state: ProjectState;
  lastSequence: number;
  updatedAt: string;
  staleAfterSeconds: number;
}

export function createMonitorSnapshot(state: ProjectState, updatedAt = new Date().toISOString()): MonitorSnapshot {
  const snapshot: MonitorSnapshot = {
    state,
    lastSequence: state.events.at(-1)?.sequence ?? 0,
    updatedAt,
    staleAfterSeconds: 30,
  };
  return redactForMonitor(snapshot);
}
