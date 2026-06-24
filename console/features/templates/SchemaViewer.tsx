import type { SchemaField } from "./schema";

/** Read-only view of a template's parameter schema. */
export function SchemaViewer({ fields }: { fields: SchemaField[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Required</th>
            <th className="px-3 py-2 font-medium">Detail</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-xs">{f.key}</td>
              <td className="px-3 py-2">{f.type}</td>
              <td className="px-3 py-2">{f.required ? "Yes" : "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{detail(f)}</td>
            </tr>
          ))}
          {fields.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                No parameters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function detail(f: SchemaField): string {
  const parts: string[] = [];
  if (f.options) parts.push(`enum: ${f.options.join(", ")}`);
  if (f.default !== undefined) parts.push(`default: ${String(f.default)}`);
  if (f.minimum !== undefined) parts.push(`min ${f.minimum}`);
  if (f.maximum !== undefined) parts.push(`max ${f.maximum}`);
  return parts.join(" · ");
}
