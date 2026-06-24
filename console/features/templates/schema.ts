/**
 * Turns a template's JSON-Schema `param_schema` into flat field descriptors, and
 * validates values against them. Supports the subset the catalog uses: object with
 * string / number / integer / boolean / enum properties, `required`, and min/max.
 * Drives both the template detail form and (Phase 3) the builder inspector.
 * See docs/TASK_TEMPLATES.md §2 and docs/WORKFLOW_BUILDER.md §4.
 */
import type { TaskTemplate } from "@/lib/contract";

export type FieldType = "string" | "number" | "integer" | "boolean" | "enum";

export interface SchemaField {
  key: string;
  type: FieldType;
  title: string;
  description?: string;
  required: boolean;
  options?: (string | number)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

type JsonSchema = TaskTemplate["param_schema"];

export function parseSchema(schema: JsonSchema): SchemaField[] {
  const props = (schema?.properties ?? {}) as Record<string, Record<string, unknown>>;
  const required = new Set(((schema?.required as string[] | undefined) ?? []));
  return Object.entries(props).map(([key, p]) => {
    const options = p.enum as (string | number)[] | undefined;
    const t = (p.type as string) ?? "string";
    const type: FieldType = options
      ? "enum"
      : t === "integer"
        ? "integer"
        : t === "number"
          ? "number"
          : t === "boolean"
            ? "boolean"
            : "string";
    return {
      key,
      type,
      title: (p.title as string) ?? key,
      description: p.description as string | undefined,
      required: required.has(key),
      options,
      default: p.default,
      minimum: p.minimum as number | undefined,
      maximum: p.maximum as number | undefined,
    };
  });
}

export function defaultsFor(fields: SchemaField[]): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.default !== undefined) v[f.key] = f.default;
    else if (f.type === "boolean") v[f.key] = false;
    else v[f.key] = "";
  }
  return v;
}

/** Returns a map of field key → error message; empty map means valid. */
export function validate(
  fields: SchemaField[],
  value: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = value[f.key];
    const empty = v === "" || v === undefined || v === null;
    if (f.type === "boolean") continue;
    if (f.required && empty) {
      errors[f.key] = "Required";
      continue;
    }
    if (empty) continue;
    if (f.type === "integer" || f.type === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) {
        errors[f.key] = "Must be a number";
        continue;
      }
      if (f.type === "integer" && !Number.isInteger(n)) {
        errors[f.key] = "Must be a whole number";
        continue;
      }
      if (f.minimum !== undefined && n < f.minimum) errors[f.key] = `Must be ≥ ${f.minimum}`;
      else if (f.maximum !== undefined && n > f.maximum) errors[f.key] = `Must be ≤ ${f.maximum}`;
    }
    if (f.type === "enum" && f.options && !f.options.map(String).includes(String(v))) {
      errors[f.key] = "Invalid option";
    }
  }
  return errors;
}

export function isValid(fields: SchemaField[], value: Record<string, unknown>): boolean {
  return Object.keys(validate(fields, value)).length === 0;
}
