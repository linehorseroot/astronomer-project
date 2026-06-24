"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { RunGraph } from "@/features/graph";
import { useRun, useWorkflow } from "@/lib/query/hooks";

/**
 * Run detail. The same graph the user built is the graph they watch run: we load
 * the workflow for layout and seed it with this run's task statuses, then let the
 * user replay it live via the simulator. See docs/WORKFLOW_BUILDER.md §7.
 */
export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const { data: run, isLoading } = useRun(params.runId);
  const { data: workflow } = useWorkflow(run?.workflow_id ?? "");

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!run) return <p className="text-sm text-muted-foreground">Run not found.</p>;

  return (
    <div>
      <PageHeader
        title={run.workflow_name}
        description={`${run.execution_id} · v${run.workflow_version}`}
      />
      {workflow ? (
        <RunGraph workflow={workflow} run={run} startLabel="Replay (simulated)" />
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading graph…
          </CardContent>
        </Card>
      )}
    </div>
  );
}
