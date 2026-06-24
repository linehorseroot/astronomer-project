"use client";

import { AlertTriangle, CircleAlert, CircleCheck } from "lucide-react";
import { useBuilder } from "./store";
import { useProblems } from "./useProblems";

/** Live problems list — errors block publish; warnings don't. Click to focus a task. */
export function ProblemsPanel() {
  const problems = useProblems();
  const setSelected = useBuilder((s) => s.setSelected);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
        Problems ({problems.length})
      </div>
      <div className="flex-1 overflow-auto p-2">
        {problems.length === 0 ? (
          <p className="flex items-center gap-2 px-1 py-2 text-sm text-status-success">
            <CircleCheck className="h-4 w-4" /> No problems — ready to publish.
          </p>
        ) : (
          <ul className="space-y-1">
            {problems.map((p) => (
              <li key={p.id}>
                <button
                  disabled={!p.nodeId}
                  onClick={() => p.nodeId && setSelected(p.nodeId, null)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted disabled:hover:bg-transparent"
                >
                  {p.severity === "error" ? (
                    <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-failed" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-retrying" />
                  )}
                  <span>{p.message}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
