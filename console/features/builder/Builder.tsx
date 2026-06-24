"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Workflow } from "@/lib/contract";
import { BuilderBar } from "./BuilderBar";
import { BuilderCanvas } from "./BuilderCanvas";
import { Inspector } from "./Inspector";
import { NodePalette } from "./NodePalette";
import { ProblemsPanel } from "./ProblemsPanel";
import { useBuilder } from "./store";

/** Composes the builder: top bar, palette (L), canvas (C), inspector + problems (R). */
export function Builder({ workflow }: { workflow: Workflow }) {
  const load = useBuilder((s) => s.load);
  const connectError = useBuilder((s) => s.connectError);
  const clearConnectError = useBuilder((s) => s.clearConnectError);
  const deleteSelection = useBuilder((s) => s.deleteSelection);

  useEffect(() => {
    load(workflow);
  }, [workflow, load]);

  // Delete key removes the selected node/edge (ignoring text inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete") return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      deleteSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection]);

  return (
    <div className="flex h-full min-h-[32rem] flex-col">
      <BuilderBar />

      {connectError && (
        <div className="flex items-center justify-between gap-2 border-b border-status-failed/30 bg-status-failed/10 px-4 py-1.5 text-xs text-status-failed">
          <span>{connectError}</span>
          <button aria-label="Dismiss" onClick={clearConnectError}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <NodePalette />
        <div className="relative min-w-0 flex-1">
          <BuilderCanvas />
        </div>
        <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
          <div className="min-h-0 flex-1 overflow-auto">
            <Inspector />
          </div>
          <div className="h-56 shrink-0 border-t border-border">
            <ProblemsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
