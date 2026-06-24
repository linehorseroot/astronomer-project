"use client";

import type { Run } from "@/lib/contract";

/** Preview which tasks a re-run scope will re-execute — preview-then-confirm. */
export function AffectedNodesPreview({ run, affected }: { run: Run; affected: string[] }) {
  const set = new Set(affected);
  const tasks = run.tasks.filter((t) => set.has(t.node_id));

  return (
    <div className="rounded-md bg-muted p-3 text-xs">
      <div className="mb-1.5 font-medium">
        {affected.length} task{affected.length === 1 ? "" : "s"} will re-run
      </div>
      {tasks.length === 0 ? (
        <span className="text-muted-foreground">Nothing to re-run for this scope.</span>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {tasks.map((t) => (
            <li
              key={t.node_id}
              className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary"
            >
              {t.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
