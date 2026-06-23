"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useRuns, useWorkflows } from "@/lib/query/hooks";

export default function DashboardPage() {
  const workflows = useWorkflows();
  const runs = useRuns();

  const published = workflows.data?.filter((w) => w.status === "published").length ?? 0;
  const drafts = workflows.data?.filter((w) => w.status === "draft").length ?? 0;
  const failures = runs.data?.filter((r) => r.status === "failed").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Health at a glance across your workflows and recent runs."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Workflows" value={workflows.data?.length ?? 0} loading={workflows.isLoading} />
        <Stat label="Published" value={published} loading={workflows.isLoading} />
        <Stat label="Drafts" value={drafts} loading={workflows.isLoading} />
        <Stat label="Failing runs" value={failures} loading={runs.isLoading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {runs.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            )}
            {runs.data?.map((r) => (
              <Link
                key={r.execution_id}
                href={`/runs/${r.execution_id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span className="text-sm">{r.workflow_name}</span>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflows</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflows.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {workflows.data?.map((w) => (
              <Link
                key={w.id}
                href={`/workflows/${w.id}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <span className="text-sm">{w.name}</span>
                <span className="text-xs text-muted-foreground">
                  {w.tenant_id} · v{w.version} · {w.status}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-2xl font-semibold tabular-nums">{loading ? "—" : value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
