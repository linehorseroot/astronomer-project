"use client";

import { useMemo, useState } from "react";
import type { TaskTemplate } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemaForm } from "./SchemaForm";
import { SchemaViewer } from "./SchemaViewer";
import { UsageList } from "./UsageList";
import { defaultsFor, parseSchema, validate } from "./schema";

/** Template detail: an interactive param form (SchemaForm), the schema, and usage. */
export function TemplateDetail({ template }: { template: TaskTemplate }) {
  const fields = useMemo(() => parseSchema(template.param_schema), [template]);
  const [value, setValue] = useState<Record<string, unknown>>(() => defaultsFor(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(false);

  const errorCount = Object.keys(errors).length;
  const onValidate = () => {
    setErrors(validate(fields, value));
    setValidated(true);
  };
  const onChange = (next: Record<string, unknown>) => {
    setValue(next);
    if (validated) setErrors(validate(fields, next)); // live re-validate after first submit
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-muted-foreground">
            Auto-generated from the template&apos;s <code>param_schema</code>. The same
            SchemaForm drives the builder inspector in Phase 3.
          </p>
          <SchemaForm fields={fields} value={value} errors={errors} onChange={onChange} />
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" onClick={onValidate}>
              Validate
            </Button>
            {validated && errorCount === 0 && (
              <span className="text-xs text-status-success">Valid ✓</span>
            )}
            {validated && errorCount > 0 && (
              <span className="text-xs text-status-failed">
                {errorCount} error{errorCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <SchemaViewer fields={fields} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Used by</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageList templateKey={template.key} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
