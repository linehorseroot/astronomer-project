/**
 * HttpAdapter — wires the Console to the real backend (REST + WebSocket/SSE)
 * against the documented contract. Subscriptions are keyed by `execution_id`
 * (the Controller's business-level id), not Airflow internals.
 * See docs/ARCHITECTURE.md §8 and docs/SYSTEM_ARCHITECTURE.md §6–7.
 *
 * Phase 0: stub only. Implemented in Phase 6 ("Wire to backend"). The point of
 * the seam is that no feature component changes when this replaces MockAdapter.
 */
import type { Run, Schedule, TaskTemplate, Workflow } from "@/lib/contract";
import type { DataAdapter, Unsubscribe } from "../types";

const NOT_IMPLEMENTED = "HttpAdapter is not implemented yet (Phase 6). Use NEXT_PUBLIC_API_MODE=mock.";

export class HttpAdapter implements DataAdapter {
  readonly mode = "live" as const;

  constructor(
    private readonly baseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "",
    private readonly wsUrl: string = process.env.NEXT_PUBLIC_WS_URL ?? ""
  ) {}

  listTemplates(): Promise<TaskTemplate[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  getTemplate(): Promise<TaskTemplate | undefined> {
    throw new Error(NOT_IMPLEMENTED);
  }
  listWorkflows(): Promise<Workflow[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  getWorkflow(): Promise<Workflow | undefined> {
    throw new Error(NOT_IMPLEMENTED);
  }
  saveWorkflow(): Promise<Workflow> {
    throw new Error(NOT_IMPLEMENTED);
  }
  listSchedules(): Promise<Schedule[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  listRuns(): Promise<Run[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
  getRun(): Promise<Run | undefined> {
    throw new Error(NOT_IMPLEMENTED);
  }
  rerun(): Promise<Run> {
    throw new Error(NOT_IMPLEMENTED);
  }
  subscribe(): Unsubscribe {
    throw new Error(NOT_IMPLEMENTED);
  }
}
