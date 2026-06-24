"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunGraph } from "@/features/graph";
import { useWorkflow } from "@/lib/query/hooks";

export default function WorkflowDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: wf, isLoading } = useWorkflow(params.id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!wf) return <p className="text-sm text-muted-foreground">Workflow not found.</p>;

  return (
    <div>
      <PageHeader
        title={wf.name}
        description={`${wf.tenant_id} · v${wf.version} · ${wf.status}`}
      />

      <RunGraph workflow={wf} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tasks ({wf.nodes.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {wf.nodes.map((n) => {
            const downstream = wf.edges.filter((e) => e.from === n.node_id).map((e) => e.to);
            return (
              <div key={n.node_id} className="rounded-md border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{n.display_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {n.template_key}@{n.template_version}
                  </span>
                </div>
                {downstream.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground">→ {downstream.join(", ")}</div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
