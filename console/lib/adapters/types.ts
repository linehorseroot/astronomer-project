/**
 * The data-adapter seam. Every feature talks to this interface; the MockAdapter
 * and (later) HttpAdapter both implement it, so components never change when the
 * backend lands. See docs/ARCHITECTURE.md §1–3.
 */
import type {
  LifecycleEvent,
  Run,
  Schedule,
  TaskTemplate,
  Workflow,
  RerunRequest,
} from "@/lib/contract";

/** Unsubscribe handle returned by event subscriptions. */
export type Unsubscribe = () => void;

export interface EventScope {
  execution_id?: string;
  workflow_id?: string;
  tenant_id?: string;
}

export interface DataAdapter {
  readonly mode: "mock" | "live";

  // Templates
  listTemplates(): Promise<TaskTemplate[]>;
  getTemplate(key: string): Promise<TaskTemplate | undefined>;

  // Workflows
  listWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | undefined>;
  /** Upsert a workflow draft (autosave / save / publish). */
  saveWorkflow(workflow: Workflow): Promise<Workflow>;

  // Schedules
  listSchedules(workflowId: string): Promise<Schedule[]>;

  // Runs
  listRuns(): Promise<Run[]>;
  getRun(executionId: string): Promise<Run | undefined>;
  rerun(req: RerunRequest): Promise<Run>;

  /**
   * Subscribe to task-lifecycle events keyed by execution_id. In mock mode a
   * simulator emits realistic events; in live mode a WebSocket/SSE client feeds
   * the same shape. See docs/SYSTEM_ARCHITECTURE.md §6.
   */
  subscribe(scope: EventScope, onEvent: (e: LifecycleEvent) => void): Unsubscribe;
}
