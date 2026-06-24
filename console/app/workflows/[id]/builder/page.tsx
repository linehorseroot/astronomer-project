"use client";

import { useParams } from "next/navigation";
import { Builder } from "@/features/builder";
import { useWorkflow } from "@/lib/query/hooks";

export default function BuilderPage() {
  const params = useParams<{ id: string }>();
  const { data: wf, isLoading } = useWorkflow(params.id);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!wf) return <p className="text-sm text-muted-foreground">Workflow not found.</p>;

  return <Builder workflow={wf} />;
}
