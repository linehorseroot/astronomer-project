"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonCards } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useWorkflows } from "@/lib/query/hooks";

export default function WorkflowsPage() {
  const { data, isLoading, isError, refetch } = useWorkflows();

  return (
    <div>
      <PageHeader title="Workflows" description="Browse, build, schedule, and run workflows." />

      {isLoading && <SkeletonCards />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {data?.length === 0 && (
        <EmptyState
          title="No workflows yet"
          action={
            <Link href="/templates">
              <Button size="sm">Browse templates to build one</Button>
            </Link>
          }
        >
          Create your first workflow from the governed task templates.
        </EmptyState>
      )}

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
