"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { RunGraph } from "@/features/graph";
import { RerunMenu, RunTimeline, TaskDrilldown } from "@/features/runs";
import { useRun, useWorkflow } from "@/lib/query/hooks";

/**
 * Run detail — Step-Functions-style control: the live graph, granular re-run with
 * affected-task preview, per-task timeline + drilldown, and attribution/audit.
 * See docs/CONSOLE_UI.md §1 (Run History & Re-run).
 */
export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const { data: run, isLoading, isError, refetch } = useRun(params.runId);
  const { data: workflow } = useWorkflow(run?.workflow_id ?? "");
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!run) return <p className="text-sm text-muted-foreground">Run not found.</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.workflow_name}
        description={`${run.execution_id} · v${run.workflow_version}`}
        actions={<StatusBadge status={run.status} />}
      />

      <div className="-mt-3 text-xs text-muted-foreground">
        {run.triggered_by && <>Triggered by {run.triggered_by}. </>}
        {run.rerun_of && (
          <>
            Re-run of{" "}
            <Link href={`/runs/${run.rerun_of}`} className="underline">
              {run.rerun_of}
            </Link>
            {run.rerun_scope ? ` · ${run.rerun_scope.replace("_", " ")}` : ""}.
          </>
        )}
      </div>

      <RerunMenu run={run} workflow={workflow} />

      {workflow && <RunGraph workflow={workflow} run={run} startLabel="Replay (simulated)" />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
              Tasks ({run.tasks.length})
            </div>
            <RunTimeline run={run} selectedNodeId={selected} onSelect={setSelected} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <TaskDrilldown run={run} workflow={workflow} nodeId={selected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
