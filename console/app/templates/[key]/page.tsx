"use client";

import { useParams } from "next/navigation";
import type { TaskTemplate } from "@/lib/contract";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState } from "@/components/ui/states";
import { TemplateDetail } from "@/features/templates";
import { useTemplate } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

const APPROVAL: Record<TaskTemplate["governance"]["approval"], string> = {
  approved: "border-status-success/40 text-status-success",
  draft: "border-status-retrying/40 text-status-retrying",
  deprecated: "border-status-skipped/40 text-status-skipped",
};

export default function TemplateDetailPage() {
  const params = useParams<{ key: string }>();
  const { data: t, isLoading, isError, refetch } = useTemplate(params.key);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!t) return <p className="text-sm text-muted-foreground">Template not found.</p>;

  return (
    <div>
      <PageHeader
        title={t.display_name}
        description={t.summary}
        actions={
          <div className="flex items-center gap-2">
            <Badge>{t.category}</Badge>
            <Badge className={cn(APPROVAL[t.governance.approval])}>{t.governance.approval}</Badge>
            <span className="text-xs text-muted-foreground">v{t.version}</span>
          </div>
        }
      />
      {t.description && (
        <p className="mb-2 max-w-prose text-sm text-muted-foreground">{t.description}</p>
      )}
      <p className="mb-6 text-xs text-muted-foreground">
        Engine handler <code>{t.engine_handler}</code> · tenants {t.governance.tenants.join(", ")} ·
        roles {t.governance.roles.join(", ")}
      </p>
      <TemplateDetail template={t} />
    </div>
  );
}
