"use client";

import type { TaskStatus } from "@/lib/contract";
import { cn } from "@/lib/utils";

const ITEMS: { status: TaskStatus; label: string; dot: string }[] = [
  { status: "queued", label: "Queued", dot: "bg-status-queued" },
  { status: "running", label: "Running", dot: "bg-status-running" },
  { status: "deferred", label: "Deferred", dot: "bg-status-deferred" },
  { status: "success", label: "Success", dot: "bg-status-success" },
  { status: "retrying", label: "Retrying", dot: "bg-status-retrying" },
  { status: "failed", label: "Failed", dot: "bg-status-failed" },
];

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {ITEMS.map((i) => (
        <span key={i.status} className="inline-flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", i.dot)} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
