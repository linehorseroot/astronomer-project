/**
 * Continuous builder validation — the same checks the backend re-runs at publish.
 * See docs/WORKFLOW_BUILDER.md §4 (acyclicity, required params, reference integrity,
 * connectivity, naming, limits).
 */
import type { TaskTemplate } from "@/lib/contract";
import { parseSchema, validate as validateParams } from "@/features/templates/schema";

export interface NodeModel {
  id: string;
  templateKey: string;
  displayName: string;
  params: Record<string, unknown>;
}
export interface EdgeModel {
  source: string;
  target: string;
}

export type Severity = "error" | "warning";
export interface Problem {
  id: string;
  severity: Severity;
  message: string;
  nodeId?: string;
}

export const MAX_NODES = 50;

/** Is there a directed path from `from` to `to` along `edges`? */
export function hasPath(edges: EdgeModel[], from: string, to: string): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === to) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of adj.get(cur) ?? []) stack.push(n);
  }
  return false;
}

/** Would adding edge from→to create a cycle? (true also for self-loops/duplicates path) */
export function wouldCycle(edges: EdgeModel[], from: string, to: string): boolean {
  if (from === to) return true;
  return hasPath(edges, to, from);
}

function graphHasCycle(nodes: NodeModel[], edges: EdgeModel[]): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
  const state = new Map<string, 0 | 1 | 2>(); // 0=visiting,1=done
  const visit = (n: string): boolean => {
    const s = state.get(n);
    if (s === 0) return true; // back-edge → cycle
    if (s === 1) return false;
    state.set(n, 0);
    for (const m of adj.get(n) ?? []) if (visit(m)) return true;
    state.set(n, 1);
    return false;
  };
  return nodes.some((n) => visit(n.id));
}

export function validateSpec(
  name: string,
  nodes: NodeModel[],
  edges: EdgeModel[],
  templates: TaskTemplate[]
): Problem[] {
  const problems: Problem[] = [];
  const byKey = new Map(templates.map((t) => [t.key, t]));

  if (!name.trim()) problems.push({ id: "name", severity: "error", message: "Workflow needs a name." });

  if (nodes.length === 0) {
    problems.push({ id: "empty", severity: "warning", message: "Add at least one task." });
  }
  if (nodes.length > MAX_NODES) {
    problems.push({ id: "limit", severity: "error", message: `Too many tasks (max ${MAX_NODES}).` });
  }

  // Duplicate display names
  const nameCounts = new Map<string, number>();
  for (const n of nodes) nameCounts.set(n.displayName.trim(), (nameCounts.get(n.displayName.trim()) ?? 0) + 1);

  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }

  for (const n of nodes) {
    if (!n.displayName.trim()) {
      problems.push({ id: `name-${n.id}`, severity: "error", message: "Task needs a name.", nodeId: n.id });
    } else if ((nameCounts.get(n.displayName.trim()) ?? 0) > 1) {
      problems.push({
        id: `dupname-${n.id}`,
        severity: "error",
        message: `Duplicate task name “${n.displayName.trim()}”.`,
        nodeId: n.id,
      });
    }

    const tpl = byKey.get(n.templateKey);
    if (!tpl) {
      problems.push({ id: `ref-${n.id}`, severity: "error", message: `Unknown template “${n.templateKey}”.`, nodeId: n.id });
    } else {
      if (tpl.governance.approval !== "approved") {
        problems.push({ id: `appr-${n.id}`, severity: "warning", message: `“${tpl.display_name}” is ${tpl.governance.approval}.`, nodeId: n.id });
      }
      const fieldErrs = validateParams(parseSchema(tpl.param_schema), n.params);
      const keys = Object.keys(fieldErrs);
      if (keys.length > 0) {
        problems.push({
          id: `params-${n.id}`,
          severity: "error",
          message: `${n.displayName || tpl.display_name}: fix ${keys.length} parameter${keys.length > 1 ? "s" : ""} (${keys.join(", ")}).`,
          nodeId: n.id,
        });
      }
    }

    if (nodes.length > 1 && (degree.get(n.id) ?? 0) === 0) {
      problems.push({ id: `orphan-${n.id}`, severity: "warning", message: `“${n.displayName}” is not connected.`, nodeId: n.id });
    }
  }

  if (graphHasCycle(nodes, edges)) {
    problems.push({ id: "cycle", severity: "error", message: "The graph has a cycle; workflows must be a DAG." });
  }

  return problems;
}

export function countErrors(problems: Problem[]): number {
  return problems.filter((p) => p.severity === "error").length;
}
