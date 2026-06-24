/**
 * AstroFlow data contract — the single source of truth for every feature.
 *
 * Every screen (graph, builder, templates, schedules, runs) reads and writes
 * through these Zod schemas via the data adapters. See docs/ARCHITECTURE.md §2
 * and docs/WORKFLOW_BUILDER.md §2 (WorkflowSpec) / docs/TASK_TEMPLATES.md §2.
 *
 * Runtime model note: workflows run on the deferred-execution model — Airflow
 * orchestrates, a separate Execution Engine computes, and the Controller drives
 * live updates. Lifecycle events are keyed by `execution_id` (business-level),
 * never Airflow's internal ids. See docs/SYSTEM_ARCHITECTURE.md §1, §7.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Status semantics (single source of color — see docs/CONSOLE_UI.md §4) */
/* ------------------------------------------------------------------ */

export const TaskStatus = z.enum([
  "queued",
  "running",
  "success",
  "failed",
  "retrying",
  "skipped",
  "upstream_failed",
  "deferred",
]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const RunStatus = z.enum(["queued", "running", "success", "failed"]);
export type RunStatus = z.infer<typeof RunStatus>;

/* ------------------------------------------------------------------ */
/* Task templates (governed building blocks)                           */
/* ------------------------------------------------------------------ */

export const TemplateApproval = z.enum(["draft", "approved", "deprecated"]);

export const TaskTemplate = z.object({
  key: z.string(),
  version: z.string(), // semver, pinned per workflow node
  display_name: z.string(),
  category: z.string(),
  icon: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  /** Execution Engine handler invoked via task.command — not an Airflow compute operator. */
  engine_handler: z.string(),
  /** JSON Schema describing user-settable params; drives the inspector form. */
  param_schema: z.record(z.string(), z.unknown()),
  defaults: z
    .object({
      retries: z.number().int().nonnegative().default(1),
      timeout_seconds: z.number().int().positive().default(3600),
    })
    .partial()
    .optional(),
  outputs: z
    .array(z.object({ name: z.string(), type: z.string() }))
    .optional(),
  governance: z.object({
    tenants: z.array(z.string()), // "*" = all
    roles: z.array(z.string()),
    approval: TemplateApproval,
  }),
  docs_url: z.string().optional(),
});
export type TaskTemplate = z.infer<typeof TaskTemplate>;

/* ------------------------------------------------------------------ */
/* WorkflowSpec (the artifact the builder emits)                       */
/* ------------------------------------------------------------------ */

export const TriggerRule = z.enum([
  "all_success",
  "all_done",
  "one_failed",
  "one_success",
]);

export const TaskNode = z.object({
  node_id: z.string(),
  template_key: z.string(),
  template_version: z.string(),
  display_name: z.string(),
  params: z.record(z.string(), z.unknown()).default({}),
  retries: z.number().int().nonnegative().optional(),
  timeout_seconds: z.number().int().positive().optional(),
  position: z.object({ x: z.number(), y: z.number() }), // canvas layout, ignored at runtime
});
export type TaskNode = z.infer<typeof TaskNode>;

export const WorkflowEdge = z.object({
  from: z.string(),
  to: z.string(),
  trigger_rule: TriggerRule.default("all_success"),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdge>;

export const WorkflowStatus = z.enum(["draft", "published", "archived"]);

export const Workflow = z.object({
  spec_version: z.string().default("1.0"),
  id: z.string(),
  name: z.string(),
  tenant_id: z.string(),
  owner: z.string(),
  status: WorkflowStatus,
  version: z.number().int().positive().default(1),
  nodes: z.array(TaskNode),
  edges: z.array(WorkflowEdge),
  defaults: z
    .object({
      retries: z.number().int().nonnegative(),
      timeout_seconds: z.number().int().positive(),
      pool: z.string(),
    })
    .partial()
    .optional(),
  updated_at: z.string(), // ISO 8601
});
export type Workflow = z.infer<typeof Workflow>;

/* ------------------------------------------------------------------ */
/* Schedules                                                           */
/* ------------------------------------------------------------------ */

export const Schedule = z.object({
  id: z.string(),
  workflow_id: z.string(),
  workflow_version: z.number().int().positive(),
  name: z.string(),
  cron: z.string(),
  timezone: z.string().default("UTC"),
  enabled: z.boolean().default(true),
  params: z.record(z.string(), z.unknown()).default({}),
});
export type Schedule = z.infer<typeof Schedule>;

/* ------------------------------------------------------------------ */
/* Runs & task instances                                               */
/* ------------------------------------------------------------------ */

export const RerunScope = z.enum([
  "whole_run",
  "from_task",
  "single_task",
  "failed_only",
  "branch",
]);
export type RerunScope = z.infer<typeof RerunScope>;

export const TaskInstance = z.object({
  node_id: z.string(),
  display_name: z.string(),
  status: TaskStatus,
  attempt: z.number().int().nonnegative().default(0),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  duration_ms: z.number().int().nonnegative().optional(),
  error: z.string().optional(), // failure reason (DB error_message; DESIGN §3.3)
});
export type TaskInstance = z.infer<typeof TaskInstance>;

export const Run = z.object({
  /** execution_id — the Controller-minted, business-level correlation id. */
  execution_id: z.string(),
  workflow_id: z.string(),
  workflow_version: z.number().int().positive(),
  workflow_name: z.string(),
  status: RunStatus,
  started_at: z.string(),
  finished_at: z.string().optional(),
  tasks: z.array(TaskInstance),
  /** Attribution / audit. */
  triggered_by: z.string().optional(), // "user:rthangavelu" | "schedule:Nightly"
  rerun_of: z.string().optional(), // parent execution_id
  rerun_scope: RerunScope.optional(),
});
export type Run = z.infer<typeof Run>;

/* ------------------------------------------------------------------ */
/* Re-run                                                              */
/* ------------------------------------------------------------------ */

export const RerunRequest = z.object({
  execution_id: z.string(),
  scope: RerunScope,
  node_id: z.string().optional(), // required for from_task / single_task / branch
});
export type RerunRequest = z.infer<typeof RerunRequest>;

/* ------------------------------------------------------------------ */
/* Live lifecycle events (same shape for mock simulator and live WS)   */
/* ------------------------------------------------------------------ */

export const LifecycleEventType = z.enum([
  "TASK_QUEUED",
  "TASK_STARTED",
  "TASK_DEFERRED",
  "TASK_SUCCEEDED",
  "TASK_FAILED",
  "TASK_RETRYING",
  "TASK_SKIPPED",
  "TASK_UPSTREAM_FAILED",
]);
export type LifecycleEventType = z.infer<typeof LifecycleEventType>;

export const LifecycleEvent = z.object({
  execution_id: z.string(),
  node_id: z.string(),
  type: LifecycleEventType,
  status: TaskStatus,
  attempt: z.number().int().nonnegative(),
  ts: z.string(), // ISO 8601
  error: z.string().optional(), // present on TASK_FAILED (DESIGN §3.3)
});
export type LifecycleEvent = z.infer<typeof LifecycleEvent>;
