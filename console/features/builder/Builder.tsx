"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { Workflow } from "@/lib/contract";
import { useSaveWorkflow } from "@/lib/query/hooks";
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
  const undo = useBuilder((s) => s.undo);
  const redo = useBuilder((s) => s.redo);
  const duplicateSelectedNode = useBuilder((s) => s.duplicateSelectedNode);

  // For autosave (WORKFLOW_BUILDER §3 — "autosave drafts every few seconds").
  const dirty = useBuilder((s) => s.dirty);
  const nodes = useBuilder((s) => s.nodes);
  const edges = useBuilder((s) => s.edges);
  const name = useBuilder((s) => s.name);
  const toWorkflow = useBuilder((s) => s.toWorkflow);
  const markSaved = useBuilder((s) => s.markSaved);
  const { mutateAsync: saveWorkflow } = useSaveWorkflow();

  useEffect(() => {
    load(workflow);
  }, [workflow, load]);

  // Debounced autosave: ~1.5s after the last edit, persist the draft.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      saveWorkflow(toWorkflow("draft")).then(markSaved).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, nodes, edges, name, saveWorkflow, toWorkflow, markSaved]);

  // Keyboard: Del remove, ⌘Z / ⌘⇧Z undo/redo, ⌘D duplicate (ignoring text inputs).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const inField = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Delete" && !inField) {
        deleteSelection();
      } else if (mod && e.key.toLowerCase() === "z" && !inField) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "d" && !inField) {
        e.preventDefault();
        duplicateSelectedNode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection, undo, redo, duplicateSelectedNode]);

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
