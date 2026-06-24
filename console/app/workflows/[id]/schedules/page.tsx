"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { ScheduleManager } from "@/features/schedules";
import { useWorkflow } from "@/lib/query/hooks";

export default function WorkflowSchedulesPage() {
  const params = useParams<{ id: string }>();
  const { data: wf, isLoading } = useWorkflow(params.id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!wf) return <p className="text-sm text-muted-foreground">Workflow not found.</p>;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Schedules · ${wf.name}`}
        description="Run this workflow automatically — friendly recurrence, multiple schedules, no code."
      />
      <ScheduleManager workflow={wf} />
    </div>
  );
}
