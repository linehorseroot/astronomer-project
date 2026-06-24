"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Schedule, Workflow } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { useSchedules } from "@/lib/query/hooks";
import { RecurrenceEditor } from "./RecurrenceEditor";
import { ScheduleList } from "./ScheduleList";

type EditorState = { mode: "new" } | { mode: "edit"; schedule: Schedule } | null;

export function ScheduleManager({ workflow }: { workflow: Workflow }) {
  const { data, isLoading } = useSchedules(workflow.id);
  const [editor, setEditor] = useState<EditorState>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Schedules ({data?.length ?? 0})</h2>
        {!editor && (
          <Button size="sm" onClick={() => setEditor({ mode: "new" })}>
            <Plus className="h-4 w-4" />
            Add schedule
          </Button>
        )}
      </div>

      {editor ? (
        <RecurrenceEditor
          workflow={workflow}
          schedule={editor.mode === "edit" ? editor.schedule : undefined}
          onDone={() => setEditor(null)}
          onCancel={() => setEditor(null)}
        />
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ScheduleList schedules={data ?? []} onEdit={(s) => setEditor({ mode: "edit", schedule: s })} />
      )}
    </div>
  );
}
