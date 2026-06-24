"use client";

import { useState } from "react";
import { Redo2, Rocket, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSaveWorkflow } from "@/lib/query/hooks";
import { cn } from "@/lib/utils";
import { useBuilder } from "./store";
import { useProblems } from "./useProblems";
import { countErrors } from "./validate";

export function BuilderBar() {
  const name = useBuilder((s) => s.name);
  const setName = useBuilder((s) => s.setName);
  const undo = useBuilder((s) => s.undo);
  const redo = useBuilder((s) => s.redo);
  const canUndo = useBuilder((s) => s.past.length > 0);
  const canRedo = useBuilder((s) => s.future.length > 0);
  const dirty = useBuilder((s) => s.dirty);
  const baseVersion = useBuilder((s) => s.baseVersion);
  const toWorkflow = useBuilder((s) => s.toWorkflow);
  const markSaved = useBuilder((s) => s.markSaved);

  const problems = useProblems();
  const errors = countErrors(problems);
  const warnings = problems.length - errors;
  const save = useSaveWorkflow();
  const [msg, setMsg] = useState<string | null>(null);

  const onSaveDraft = async () => {
    await save.mutateAsync(toWorkflow("draft"));
    markSaved();
    setMsg("Draft saved");
  };
  const onPublish = async () => {
    if (errors > 0) return;
    const next = baseVersion + 1;
    await save.mutateAsync(toWorkflow("published", next));
    markSaved();
    setMsg(`Published v${next}`);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-3">
        <Input
          aria-label="Workflow name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 w-64 font-medium"
        />
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs",
            errors > 0
              ? "border-status-failed/40 text-status-failed"
              : "border-status-success/40 text-status-success"
          )}
        >
          {errors > 0 ? `${errors} error${errors > 1 ? "s" : ""}` : "Valid"}
          {warnings > 0 ? ` · ${warnings} warning${warnings > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        {dirty && <span className="text-xs text-status-retrying">Unsaved</span>}
        <Button variant="ghost" size="sm" aria-label="Undo" disabled={!canUndo} onClick={undo}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Redo" disabled={!canRedo} onClick={redo}>
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={save.isPending}>
          <Save className="h-4 w-4" />
          Save draft
        </Button>
        <Button size="sm" onClick={onPublish} disabled={errors > 0 || save.isPending}>
          <Rocket className="h-4 w-4" />
          Publish
        </Button>
      </div>
    </div>
  );
}
