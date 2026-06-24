"use client";

import { Copy, Trash2 } from "lucide-react";
import { SchemaForm, parseSchema, validate } from "@/features/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useTemplates } from "@/lib/query/hooks";
import { TRIGGER_RULES, useBuilder, type TriggerRule } from "./store";

export function Inspector() {
  const selectedNodeId = useBuilder((s) => s.selectedNodeId);
  const selectedEdgeId = useBuilder((s) => s.selectedEdgeId);
  const nodes = useBuilder((s) => s.nodes);
  const edges = useBuilder((s) => s.edges);
  const updateSelectedNode = useBuilder((s) => s.updateSelectedNode);
  const setEdgeTrigger = useBuilder((s) => s.setEdgeTrigger);
  const deleteSelection = useBuilder((s) => s.deleteSelection);
  const duplicateSelectedNode = useBuilder((s) => s.duplicateSelectedNode);
  const { data: templates } = useTemplates();

  const node = nodes.find((n) => n.id === selectedNodeId);
  const edge = edges.find((e) => e.id === selectedEdgeId);

  if (!node && !edge) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a task or connection to edit it. Drag a template from the palette to add a task.
      </div>
    );
  }

  if (edge) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-sm font-semibold">Connection</h3>
        <div className="text-xs text-muted-foreground">
          {edge.source} → {edge.target}
        </div>
        <div className="space-y-1">
          <Label htmlFor="trigger">Trigger rule</Label>
          <Select
            id="trigger"
            value={edge.data?.triggerRule ?? "all_success"}
            onChange={(e) => setEdgeTrigger(edge.id, e.target.value as TriggerRule)}
          >
            {TRIGGER_RULES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={deleteSelection}>
          <Trash2 className="h-4 w-4" />
          Delete connection
        </Button>
      </div>
    );
  }

  if (!node) return null;
  const tpl = templates?.find((t) => t.key === node.data.templateKey);
  const fields = tpl ? parseSchema(tpl.param_schema) : [];
  const errors = validate(fields, node.data.params);

  return (
    <div className="space-y-5 p-4">
      <div>
        <h3 className="text-sm font-semibold">{tpl?.display_name ?? node.data.templateKey}</h3>
        <p className="font-mono text-xs text-muted-foreground">{node.data.templateKey}</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="display_name">Task name</Label>
        <Input
          id="display_name"
          value={node.data.displayName}
          onChange={(e) => updateSelectedNode({ displayName: e.target.value })}
        />
      </div>

      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Parameters</div>
        <SchemaForm
          idPrefix={`insp-${node.id}`}
          fields={fields}
          value={node.data.params}
          errors={errors}
          onChange={(params) => updateSelectedNode({ params })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="retries">Retries</Label>
          <Input
            id="retries"
            type="number"
            value={node.data.retries ?? ""}
            onChange={(e) =>
              updateSelectedNode({ retries: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="timeout">Timeout (s)</Label>
          <Input
            id="timeout"
            type="number"
            value={node.data.timeoutSeconds ?? ""}
            onChange={(e) =>
              updateSelectedNode({
                timeoutSeconds: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={duplicateSelectedNode}>
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>
        <Button variant="outline" size="sm" onClick={deleteSelection}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
