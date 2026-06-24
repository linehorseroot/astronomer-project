/**
 * MockAdapter — a seeded in-memory implementation of the data contract plus a
 * simulated live-event stream. Lets every Console surface work end to end with
 * no backend. See docs/ARCHITECTURE.md §1.
 */
import type {
  LifecycleEvent,
  RerunRequest,
  Run,
  Schedule,
  TaskTemplate,
  Workflow,
} from "@/lib/contract";
import type { DataAdapter, EventScope, Unsubscribe } from "../types";
import { seedRuns, seedSchedules, seedTemplates, seedWorkflows } from "./seed";
import { simulateRun } from "./simulator";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export class MockAdapter implements DataAdapter {
  readonly mode = "mock" as const;

  private templates = clone(seedTemplates);
  private workflows = clone(seedWorkflows);
  private schedules = clone(seedSchedules);
  private runs = clone(seedRuns);

  async listTemplates(): Promise<TaskTemplate[]> {
    return clone(this.templates);
  }
  async getTemplate(key: string): Promise<TaskTemplate | undefined> {
    return clone(this.templates.find((t) => t.key === key));
  }

  async listWorkflows(): Promise<Workflow[]> {
    return clone(this.workflows);
  }
  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return clone(this.workflows.find((w) => w.id === id));
  }

  async saveWorkflow(workflow: Workflow): Promise<Workflow> {
    const saved = clone({ ...workflow, updated_at: new Date().toISOString() });
    const i = this.workflows.findIndex((w) => w.id === workflow.id);
    if (i >= 0) this.workflows[i] = saved;
    else this.workflows.push(saved);
    return clone(saved);
  }

  async listSchedules(workflowId: string): Promise<Schedule[]> {
    return clone(this.schedules.filter((s) => s.workflow_id === workflowId));
  }

  async listAllSchedules(): Promise<Schedule[]> {
    return clone(this.schedules);
  }

  async saveSchedule(schedule: Schedule): Promise<Schedule> {
    const saved = clone(schedule);
    const i = this.schedules.findIndex((s) => s.id === schedule.id);
    if (i >= 0) this.schedules[i] = saved;
    else this.schedules.push(saved);
    return clone(saved);
  }

  async deleteSchedule(id: string): Promise<void> {
    this.schedules = this.schedules.filter((s) => s.id !== id);
  }

  async listRuns(): Promise<Run[]> {
    return clone(this.runs);
  }
  async getRun(executionId: string): Promise<Run | undefined> {
    return clone(this.runs.find((r) => r.execution_id === executionId));
  }

  async rerun(req: RerunRequest): Promise<Run> {
    const prev = this.runs.find((r) => r.execution_id === req.execution_id);
    if (!prev) throw new Error(`Unknown run ${req.execution_id}`);
    const fresh: Run = {
      ...clone(prev),
      execution_id: `exec_${Date.now()}`,
      status: "queued",
      started_at: new Date().toISOString(),
      finished_at: undefined,
      tasks: prev.tasks.map((t) => ({ ...t, status: "queued", attempt: 0, duration_ms: undefined })),
    };
    this.runs.unshift(fresh);
    return clone(fresh);
  }

  subscribe(scope: EventScope, onEvent: (e: LifecycleEvent) => void): Unsubscribe {
    // Resolve which workflow to animate from the scope.
    const wf =
      this.workflows.find((w) => w.id === scope.workflow_id) ?? this.workflows[0];
    const execution_id = scope.execution_id ?? `exec_${Date.now()}`;
    if (!wf) return () => {};
    const sim = simulateRun(wf, execution_id, onEvent, { failNode: wf.nodes[1]?.node_id });
    return () => sim.stop();
  }
}
