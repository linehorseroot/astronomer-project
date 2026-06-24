"use client";

import Link from "next/link";
import { useWorkflows } from "@/lib/query/hooks";

/** Workflows that reference a given template — the template's "where used". */
export function UsageList({ templateKey }: { templateKey: string }) {
  const { data, isLoading } = useWorkflows();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const used = (data ?? [])
    .map((w) => ({
      workflow: w,
      count: w.nodes.filter((n) => n.template_key === templateKey).length,
    }))
    .filter((u) => u.count > 0);

  if (used.length === 0) {
    return <p className="text-sm text-muted-foreground">Not used by any workflow yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {used.map(({ workflow, count }) => (
        <li key={workflow.id} className="flex items-center justify-between">
          <Link href={`/workflows/${workflow.id}`} className="text-sm hover:underline">
            {workflow.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {count} node{count > 1 ? "s" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
