import type { TaskStatus, RunStatus } from "@/lib/contract";
import { cn } from "@/lib/utils";

/**
 * Status pill driven by the shared status tokens — never hardcode status colors.
 * See docs/CONSOLE_UI.md §4 and docs/CONTRIBUTING.md §4.
 */
const LABEL: Record<TaskStatus, string> = {
  queued: "Queued",
  running: "Running",
  success: "Success",
  failed: "Failed",
  retrying: "Retrying",
  skipped: "Skipped",
  upstream_failed: "Upstream failed",
  deferred: "Deferred",
};

const DOT: Record<TaskStatus, string> = {
  queued: "bg-status-queued",
  running: "bg-status-running",
  success: "bg-status-success",
  failed: "bg-status-failed",
  retrying: "bg-status-retrying",
  skipped: "bg-status-skipped",
  upstream_failed: "bg-status-upstream",
  deferred: "bg-status-deferred",
};

export function StatusBadge({ status }: { status: TaskStatus | RunStatus }) {
  const s = status as TaskStatus;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[s], s === "running" && "animate-pulse")} />
      {LABEL[s] ?? status}
    </span>
  );
}
