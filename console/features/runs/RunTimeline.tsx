"use client";

import type { Run } from "@/lib/contract";
import { StatusBadge } from "@/components/status/StatusBadge";
import { cn } from "@/lib/utils";

/** Per-task list for a run; click a task to drill in. */
export function RunTimeline({
  run,
  selectedNodeId,
  onSelect,
}: {
  run: Run;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <div className="divide-y divide-border">
      {run.tasks.map((t) => (
        <button
          key={t.node_id}
          onClick={() => onSelect(t.node_id)}
          className={cn(
            "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
            selectedNodeId === t.node_id && "bg-muted"
          )}
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{t.display_name}</div>
            <div className="text-xs text-muted-foreground">
              attempt {t.attempt}
              {t.duration_ms ? ` · ${Math.round(t.duration_ms / 1000)}s` : ""}
            </div>
          </div>
          <StatusBadge status={t.status} />
        </button>
      ))}
    </div>
  );
}
