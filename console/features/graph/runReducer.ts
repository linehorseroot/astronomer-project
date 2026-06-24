/**
 * Event-sourced run state. Lifecycle events are folded into per-task status;
 * the graph reads derived status, never raw events. See docs/ARCHITECTURE.md §5
 * and docs/PERFORMANCE.md §3.
 */
import type { LifecycleEvent, Run, TaskStatus, Workflow } from "@/lib/contract";

export interface NodeRunState {
  status: TaskStatus;
  attempt: number;
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  error?: string;
}

export type RunState = Record<string, NodeRunState>;

const TERMINAL: ReadonlySet<TaskStatus> = new Set([
  "success",
  "failed",
  "skipped",
  "upstream_failed",
]);

export function initFromWorkflow(wf: Workflow): RunState {
  const s: RunState = {};
  for (const n of wf.nodes) s[n.node_id] = { status: "queued", attempt: 0 };
  return s;
}

export function initFromRun(run: Run): RunState {
  const s: RunState = {};
  for (const t of run.tasks) {
    s[t.node_id] = {
      status: t.status,
      attempt: t.attempt,
      started_at: t.started_at,
      finished_at: t.finished_at,
      duration_ms: t.duration_ms,
      error: t.error,
    };
  }
  return s;
}

/** Fold a single lifecycle event into state (pure). */
export function runReducer(state: RunState, e: LifecycleEvent): RunState {
  const prev = state[e.node_id] ?? { status: "queued" as TaskStatus, attempt: 0 };
  const next: NodeRunState = { ...prev, status: e.status, attempt: e.attempt };
  if (e.error) next.error = e.error;
  if (e.type === "TASK_STARTED" && !next.started_at) next.started_at = e.ts;
  if (TERMINAL.has(e.status)) {
    next.finished_at = e.ts;
    if (next.started_at) {
      next.duration_ms = new Date(e.ts).getTime() - new Date(next.started_at).getTime();
    }
  }
  return { ...state, [e.node_id]: next };
}

/** Fold a batch of events in one pass (used by the per-frame flush). */
export function reduceMany(state: RunState, events: LifecycleEvent[]): RunState {
  return events.reduce(runReducer, state);
}

export function isComplete(state: RunState): boolean {
  const values = Object.values(state);
  return values.length > 0 && values.every((s) => TERMINAL.has(s.status));
}
