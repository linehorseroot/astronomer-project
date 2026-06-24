"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCards } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useTemplates } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";

const APPROVAL: Record<string, string> = {
  approved: "border-status-success/40 text-status-success",
  draft: "border-status-retrying/40 text-status-retrying",
  deprecated: "border-status-skipped/40 text-status-skipped",
};

export default function TemplatesPage() {
  const { data, isLoading, isError, refetch } = useTemplates();
  const [q, setQ] = useState("");

  const byCategory = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = (data ?? []).filter((t) =>
      !needle
        ? true
        : `${t.display_name} ${t.summary ?? ""} ${t.category} ${t.key}`
            .toLowerCase()
            .includes(needle)
    );
    return filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
      (acc[t.category] ||= []).push(t);
      return acc;
    }, {});
  }, [data, q]);

  const empty = !isLoading && Object.keys(byCategory).length === 0;

  return (
    <div>
      <PageHeader
        title="Task templates"
        description="The governed catalog of reusable building blocks."
      />

      <div className="relative mb-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
          className="pl-9"
        />
      </div>

      {isLoading && <SkeletonCards />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {empty && <p className="text-sm text-muted-foreground">No templates match “{q}”.</p>}

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, templates]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Link key={t.key} href={`/templates/${t.key}`}>
                  <Card className="h-full transition-colors hover:border-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{t.display_name}</div>
                        <span className="shrink-0 text-xs text-muted-foreground">v{t.version}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge className={cn(APPROVAL[t.governance.approval])}>
                          {t.governance.approval}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {t.engine_handler}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
