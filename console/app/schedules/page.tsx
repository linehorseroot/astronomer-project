"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { describeCron } from "@/features/schedules";
import { useAllSchedules, useWorkflows } from "@/lib/query/hooks";

export default function SchedulesPage() {
  const { data: schedules, isLoading } = useAllSchedules();
  const { data: workflows } = useWorkflows();
  const nameOf = (id: string) => workflows?.find((w) => w.id === id)?.name ?? id;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Schedules"
        description="Every schedule across your workflows. Open a workflow to add or edit."
      />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && (schedules?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No schedules yet.</p>
      )}
      <div className="space-y-2">
        {schedules?.map((s) => (
          <Link key={s.id} href={`/workflows/${s.workflow_id}/schedules`}>
            <Card className="transition-colors hover:border-primary">
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    {nameOf(s.workflow_id)}
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{s.name}</span>
                    {!s.enabled && (
                      <span className="rounded-full border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">
                        paused
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 pl-6 text-xs text-muted-foreground">
                    {describeCron(s.cron).text} · {s.timezone}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
