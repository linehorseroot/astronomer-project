"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";
import { useRuns } from "@/lib/query/hooks";

function durationLabel(started: string, finished?: string): string {
  if (!finished) return "—";
  const ms = new Date(finished).getTime() - new Date(started).getTime();
  if (ms < 0) return "—";
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

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
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.workflow_name}
                  {r.rerun_of && (
                    <span className="rounded-full border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">
                      re-run
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.execution_id} · {new Date(r.started_at).toLocaleString()} ·{" "}
                  {durationLabel(r.started_at, r.finished_at)}
                  {r.triggered_by ? ` · ${r.triggered_by}` : ""}
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
