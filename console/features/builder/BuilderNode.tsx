"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { isValid, parseSchema } from "@/features/templates/schema";
import { useTemplates } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";
import type { BNode } from "./store";

/** Editable builder node: shows name, template, and a param-completeness dot. */
function BuilderNodeImpl({ data, selected }: NodeProps<BNode>) {
  const { data: templates } = useTemplates();
  const tpl = templates?.find((t) => t.key === data.templateKey);
  const complete = tpl ? isValid(parseSchema(tpl.param_schema), data.params) : true;

  return (
    <div
      className={cn(
        "w-52 rounded-md border-2 bg-card px-3 py-2 shadow-sm transition-colors",
        complete ? "border-border" : "border-status-retrying",
        selected && "ring-2 ring-primary"
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-border !bg-muted" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{data.displayName || "Untitled task"}</span>
        <span
          title={complete ? "Parameters complete" : "Missing required parameters"}
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            complete ? "bg-status-success" : "bg-status-retrying"
          )}
        />
      </div>
      <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
        {data.templateKey}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-border !bg-muted" />
    </div>
  );
}

export const BuilderNode = memo(BuilderNodeImpl);
