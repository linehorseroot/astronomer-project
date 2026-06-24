"use client";

import { X } from "lucide-react";
import type { Workflow } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/StatusBadge";
import type { RunState } from "./runReducer";

/** Context panel for the selected node: status, attempts, duration, params, logs. */
export function NodeDrawer({
  workflow,
  state,
  selectedId,
  onClose,
}: {
  workflow: Workflow;
  state: RunState;
  selectedId: string | null;
  onClose: () => void;
}) {
  if (!selectedId) return null;
  const node = workflow.nodes.find((n) => n.node_id === selectedId);
  if (!node) return null;
  const rs = state[selectedId];

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{node.display_name}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {node.template_key}@{node.template_version}
          </div>
        </div>
        <Button variant="ghost" size="sm" aria-label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4 text-sm">
        <div className="flex items-center gap-2">
          {rs && <StatusBadge status={rs.status} />}
          {rs && <span className="text-xs text-muted-foreground">attempt {rs.attempt}</span>}
        </div>

        <Field label="Duration">
          {rs?.duration_ms != null ? `${Math.round(rs.duration_ms / 1000)}s` : "—"}
        </Field>
        <Field label="Started">{rs?.started_at ? new Date(rs.started_at).toLocaleTimeString() : "—"}</Field>
        <Field label="Finished">
          {rs?.finished_at ? new Date(rs.finished_at).toLocaleTimeString() : "—"}
        </Field>

        {rs?.error && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Error</div>
            <pre className="overflow-auto rounded-md border border-status-failed/40 bg-status-failed/10 p-2 text-xs text-status-failed">
              {rs.error}
            </pre>
          </div>
        )}

        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Parameters</div>
          <pre className="overflow-auto rounded-md border border-border bg-muted p-2 text-xs">
            {JSON.stringify(node.params, null, 2)}
          </pre>
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Logs</div>
          <div className="rounded-md border border-border bg-muted p-2 text-xs text-muted-foreground">
            Live logs stream here once wired to the Controller (Phase 6).
          </div>
        </div>
      </div>
    </aside>
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
