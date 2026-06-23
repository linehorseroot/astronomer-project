"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkflows } from "@/lib/query/hooks";

export default function WorkflowsPage() {
  const { data, isLoading } = useWorkflows();
  return (
    <div>
      <PageHeader title="Workflows" description="Browse, build, schedule, and run workflows." />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((w) => (
          <Link key={w.id} href={`/workflows/${w.id}`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="pt-4">
                <div className="font-medium">{w.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {w.tenant_id} · v{w.version} · {w.status} · {w.nodes.length} tasks
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
