"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { RerunScope, Run, Workflow } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRerun } from "@/lib/query/hooks";
import { affectedNodes, SCOPE_LABEL, scopeNeedsNode } from "@/lib/rerun";
import { AffectedNodesPreview } from "./AffectedNodesPreview";

const SCOPES: RerunScope[] = ["whole_run", "failed_only", "from_task", "single_task", "branch"];

/** Granular re-run: pick a scope, preview affected tasks, confirm. */
export function RerunMenu({ run, workflow }: { run: Run; workflow?: Workflow }) {
  const router = useRouter();
  const rerun = useRerun();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<RerunScope>(
    run.status === "failed" ? "failed_only" : "whole_run"
  );
  const [nodeId, setNodeId] = useState(run.tasks[0]?.node_id ?? "");

  const affected = useMemo(
    () => (workflow ? affectedNodes(workflow, run, scope, nodeId) : []),
    [workflow, run, scope, nodeId]
  );
  const needsNode = scopeNeedsNode(scope);
  const canConfirm = affected.length > 0 && (!needsNode || Boolean(nodeId)) && !rerun.isPending;

  const onConfirm = async () => {
    const fresh = await rerun.mutateAsync({
      execution_id: run.execution_id,
      scope,
      node_id: needsNode ? nodeId : undefined,
    });
    router.push(`/runs/${fresh.execution_id}`);
  };

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="h-4 w-4" />
        Re-run
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Re-run</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="rerun-scope">Scope</Label>
          <Select
            id="rerun-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as RerunScope)}
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        {needsNode && (
          <div className="space-y-1">
            <Label htmlFor="rerun-node">Task</Label>
            <Select id="rerun-node" value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              {run.tasks.map((t) => (
                <option key={t.node_id} value={t.node_id}>
                  {t.display_name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <AffectedNodesPreview run={run} affected={affected} />

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onConfirm} disabled={!canConfirm}>
          Confirm re-run ({affected.length})
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
