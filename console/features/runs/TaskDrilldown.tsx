"use client";

import type { Run, Workflow } from "@/lib/contract";
import { StatusBadge } from "@/components/status/StatusBadge";

/** Detail for the selected task: status, attempts, timing, params, logs. */
export function TaskDrilldown({
  run,
  workflow,
  nodeId,
}: {
  run: Run;
  workflow?: Workflow;
  nodeId: string | null;
}) {
  const task = nodeId ? run.tasks.find((t) => t.node_id === nodeId) : undefined;
  const node = nodeId ? workflow?.nodes.find((n) => n.node_id === nodeId) : undefined;

  if (!task) {
    return <div className="p-4 text-sm text-muted-foreground">Select a task to inspect it.</div>;
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-semibold">{task.display_name}</h3>
        <StatusBadge status={task.status} />
      </div>

      <Field label="Attempt">{task.attempt}</Field>
      <Field label="Duration">
        {task.duration_ms != null ? `${Math.round(task.duration_ms / 1000)}s` : "—"}
      </Field>
      <Field label="Started">
        {task.started_at ? new Date(task.started_at).toLocaleString() : "—"}
      </Field>
      <Field label="Finished">
        {task.finished_at ? new Date(task.finished_at).toLocaleString() : "—"}
      </Field>

      {task.error && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Error</div>
          <pre className="overflow-auto rounded-md border border-status-failed/40 bg-status-failed/10 p-2 text-xs text-status-failed">
            {task.error}
          </pre>
        </div>
      )}

      {node && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Parameters</div>
          <pre className="overflow-auto rounded-md border border-border bg-muted p-2 text-xs">
            {JSON.stringify(node.params, null, 2)}
          </pre>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs font-medium text-muted-foreground">Logs</div>
        <div className="rounded-md border border-border bg-muted p-2 text-xs text-muted-foreground">
          Task logs stream here once wired to the Controller (Phase 6).
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}
