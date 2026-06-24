"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { TaskStatus } from "@/lib/contract";
import { cn } from "@/lib/utils";

export type StatusNodeData = {
  label: string;
  templateKey: string;
  status: TaskStatus;
};

export type StatusFlowNode = Node<StatusNodeData, "status">;

/** Border color per status — sourced from the shared status tokens. */
const BORDER: Record<TaskStatus, string> = {
  queued: "border-status-queued",
  running: "border-status-running",
  success: "border-status-success",
  failed: "border-status-failed",
  retrying: "border-status-retrying",
  skipped: "border-status-skipped",
  upstream_failed: "border-status-upstream",
  deferred: "border-status-deferred",
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

function StatusNodeImpl({ data, selected }: NodeProps<StatusFlowNode>) {
  const { label, templateKey, status } = data;
  return (
    <div
      role="group"
      aria-label={`${label}: ${status.replace(/_/g, " ")}`}
      className={cn(
        "w-48 rounded-md border-2 bg-card px-3 py-2 shadow-sm transition-colors",
        BORDER[status],
        selected && "ring-2 ring-primary"
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-border !bg-muted" />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            DOT[status],
            (status === "running" || status === "retrying") && "animate-pulse"
          )}
        />
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <div className="mt-0.5 truncate pl-4 font-mono text-[11px] text-muted-foreground">
        {templateKey}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-border !bg-muted" />
    </div>
  );
}

/** Memoized so a single task event re-renders only its node (docs/PERFORMANCE.md §2). */
export const StatusNode = memo(StatusNodeImpl);
