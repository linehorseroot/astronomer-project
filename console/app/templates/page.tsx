"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { useTemplates } from "@/lib/query/hooks";

export default function TemplatesPage() {
  const { data, isLoading } = useTemplates();

  const byCategory = (data ?? []).reduce<Record<string, typeof data>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Task templates"
        description="The governed catalog of reusable building blocks."
      />
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, templates]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((t) => (
                <Card key={t.key}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{t.display_name}</div>
                      <span className="text-xs text-muted-foreground">v{t.version}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
