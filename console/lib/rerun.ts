/**
 * Re-run scope semantics — which task nodes a given re-run touches. Shared by the
 * mock adapter (to reset the right tasks) and the UI (affected-node preview).
 * See docs/CONSOLE_UI.md §1 (RerunMenu, AffectedNodesPreview) and the RerunScope
 * contract.
 */
import type { RerunScope, Run, Workflow } from "@/lib/contract";

/** Downstream descendants of `start` (excluding start itself). */
function descendants(workflow: Workflow, start: string): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of workflow.edges) {
    (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  }
  const out = new Set<string>();
  const stack = [...(adj.get(start) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (out.has(n)) continue;
    out.add(n);
    for (const m of adj.get(n) ?? []) stack.push(m);
  }
  return out;
}

const FAILED_STATES = new Set(["failed", "upstream_failed"]);

/** The node ids a re-run of `scope` (anchored at `nodeId`) would re-execute. */
export function affectedNodes(
  workflow: Workflow,
  run: Run,
  scope: RerunScope,
  nodeId?: string
): string[] {
  const all = run.tasks.map((t) => t.node_id);
  switch (scope) {
    case "whole_run":
      return all;
    case "failed_only":
      return run.tasks.filter((t) => FAILED_STATES.has(t.status)).map((t) => t.node_id);
    case "single_task":
      return nodeId ? [nodeId] : [];
    case "from_task":
    case "branch": {
      if (!nodeId) return [];
      const d = descendants(workflow, nodeId);
      return [nodeId, ...all.filter((id) => d.has(id))];
    }
  }
}

export const SCOPE_LABEL: Record<RerunScope, string> = {
  whole_run: "Whole run",
  from_task: "From this task & downstream",
  single_task: "This task only",
  failed_only: "Failed tasks only",
  branch: "This branch (task + downstream)",
};

export function scopeNeedsNode(scope: RerunScope): boolean {
  return scope === "from_task" || scope === "single_task" || scope === "branch";
}
