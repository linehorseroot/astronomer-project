"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useRuns } from "@/lib/query/hooks";

export default function RunsPage() {
  const { data, isLoading } = useRuns();
  return (
    <div>
      <PageHeader title="Runs" description="History of workflow runs and their outcomes." />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {data?.map((r) => (
            <Link
              key={r.execution_id}
              href={`/runs/${r.execution_id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted"
            >
              <div>
                <div className="text-sm font-medium">{r.workflow_name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.execution_id} · started {new Date(r.started_at).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
          {data?.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">No runs yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
