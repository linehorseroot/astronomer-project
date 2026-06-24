"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Schedule } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeleteSchedule, useSaveSchedule } from "@/lib/query/hooks";
import { describeCron } from "./cron";

export function ScheduleList({
  schedules,
  onEdit,
}: {
  schedules: Schedule[];
  onEdit: (s: Schedule) => void;
}) {
  const save = useSaveSchedule();
  const del = useDeleteSchedule();

  if (schedules.length === 0) {
    return <p className="text-sm text-muted-foreground">No schedules yet. Add one to run this workflow automatically.</p>;
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {schedules.map((s) => (
        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              {s.name}
              {!s.enabled && (
                <span className="rounded-full border border-border bg-muted px-1.5 text-[11px] text-muted-foreground">
                  paused
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {describeCron(s.cron).text} · {s.timezone}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <label className="mr-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox checked={s.enabled} onChange={(e) => save.mutate({ ...s, enabled: e.target.checked })} />
              Enabled
            </label>
            <Button variant="ghost" size="sm" aria-label="Edit schedule" onClick={() => onEdit(s)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" aria-label="Delete schedule" onClick={() => del.mutate(s)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
