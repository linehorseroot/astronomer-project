"use client";

/**
 * Auto-generates a form from a template's param_schema (parsed to SchemaField[]).
 * Controlled: the parent owns `value` and `errors`, so the same component drives
 * the template detail "try it" form now and the builder inspector in Phase 3.
 * No bespoke form code per template (docs/TASK_TEMPLATES.md §2).
 */
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SchemaField } from "./schema";

export function SchemaForm({
  fields,
  value,
  errors = {},
  onChange,
  idPrefix = "f",
}: {
  fields: SchemaField[];
  value: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (next: Record<string, unknown>) => void;
  idPrefix?: string;
}) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const id = `${idPrefix}-${f.key}`;
        const err = errors[f.key];
        const req = f.required ? <span className="ml-0.5 text-status-failed">*</span> : null;

        if (f.type === "boolean") {
          return (
            <div key={f.key} className="space-y-1">
              <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  id={id}
                  checked={Boolean(value[f.key])}
                  onChange={(e) => set(f.key, e.target.checked)}
                />
                {f.title}
                {req}
              </label>
              {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
            </div>
          );
        }

        return (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={id}>
              {f.title}
              {req}
            </Label>
            {f.type === "enum" ? (
              <Select
                id={id}
                value={String(value[f.key] ?? "")}
                aria-invalid={Boolean(err)}
                onChange={(e) => set(f.key, e.target.value)}
              >
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={String(o)} value={String(o)}>
                    {String(o)}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id={id}
                type={f.type === "string" ? "text" : "number"}
                inputMode={f.type === "string" ? undefined : "numeric"}
                value={String(value[f.key] ?? "")}
                aria-invalid={Boolean(err)}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
            {err && <p className="text-xs text-status-failed">{err}</p>}
          </div>
        );
      })}
    </div>
  );
}
