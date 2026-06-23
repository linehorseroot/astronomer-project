"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status/StatusBadge";
import { getAdapter } from "@/lib/adapters";
import type { LifecycleEvent, TaskStatus } from "@/lib/contract";
import { useRun } from "@/lib/query/hooks";

/**
 * Run detail. Demonstrates the Phase 0 event path end to end: clicking "Watch
 * live (simulated)" subscribes to the MockAdapter's event simulator and folds
 * lifecycle events into per-task status — the same path the Phase 1 live graph
 * will use. See docs/ARCHITECTURE.md §3, §5.
 */
export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const { data: run, isLoading } = useRun(params.runId);
  const [live, setLive] = useState<Record<string, TaskStatus>>({});
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!watching || !run) return;
    const adapter = getAdapter();
    const unsubscribe = adapter.subscribe(
      { execution_id: run.execution_id, workflow_id: run.workflow_id },
      (e: LifecycleEvent) => setLive((prev) => ({ ...prev, [e.node_id]: e.status }))
    );
    return unsubscribe;
  }, [watching, run]);

  const tasks = useMemo(
    () =>
      run?.tasks.map((t) => ({ ...t, status: live[t.node_id] ?? t.status })) ?? [],
    [run, live]
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!run) return <p className="text-sm text-muted-foreground">Run not found.</p>;

  return (
    <div>
      <PageHeader
        title={run.workflow_name}
        description={`${run.execution_id} · v${run.workflow_version}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => setWatching((v) => !v)}>
            {watching ? "Stop" : "Watch live (simulated)"}
          </Button>
        }
      />
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {tasks.map((t) => (
            <div key={t.node_id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{t.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  attempt {t.attempt}
                  {t.duration_ms ? ` · ${Math.round(t.duration_ms / 1000)}s` : ""}
                </div>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
