"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import type { Schedule, Workflow } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useSaveSchedule } from "@/lib/query/hooks";
import { CronPreview } from "./CronPreview";
import {
  buildCron,
  DEFAULT_PARTS,
  isValidCron,
  PRESET_LABELS,
  TIMEZONES,
  WEEKDAYS,
  type Preset,
  type RecurrenceParts,
} from "./cron";

type KV = { key: string; value: string };

function paramsToRows(params: Record<string, unknown>): KV[] {
  return Object.entries(params).map(([key, v]) => ({ key, value: String(v) }));
}
function rowsToParams(rows: KV[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const r of rows) if (r.key.trim()) out[r.key.trim()] = r.value;
  return out;
}

export function RecurrenceEditor({
  workflow,
  schedule,
  onDone,
  onCancel,
}: {
  workflow: Workflow;
  schedule?: Schedule;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(schedule);
  const [name, setName] = useState(schedule?.name ?? "Nightly");
  const [mode, setMode] = useState<"preset" | "advanced">(editing ? "advanced" : "preset");
  const [parts, setParts] = useState<RecurrenceParts>(DEFAULT_PARTS);
  const [advancedCron, setAdvancedCron] = useState(schedule?.cron ?? "0 2 * * *");
  const [timezone, setTimezone] = useState(schedule?.timezone ?? "UTC");
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);
  const [rows, setRows] = useState<KV[]>(schedule ? paramsToRows(schedule.params) : []);

  const cron = mode === "preset" ? buildCron(parts) : advancedCron;
  const valid = useMemo(() => isValidCron(cron) && name.trim().length > 0, [cron, name]);
  const save = useSaveSchedule();

  const patch = (p: Partial<RecurrenceParts>) => setParts((prev) => ({ ...prev, ...p }));

  const onSave = async () => {
    if (!valid) return;
    const next: Schedule = {
      id: schedule?.id ?? `sch_${Date.now()}`,
      workflow_id: workflow.id,
      workflow_version: schedule?.workflow_version ?? workflow.version,
      name: name.trim(),
      cron,
      timezone,
      enabled,
      params: rowsToParams(rows),
    };
    await save.mutateAsync(next);
    onDone();
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="text-sm font-semibold">{editing ? "Edit schedule" : "New schedule"}</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="sch-name">Name</Label>
          <Input id="sch-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sch-tz">Timezone</Label>
          <Select id="sch-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex gap-1 rounded-md border border-border p-0.5 text-sm">
        {(["preset", "advanced"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={
              mode === m
                ? "flex-1 rounded bg-muted px-2 py-1 font-medium"
                : "flex-1 rounded px-2 py-1 text-muted-foreground"
            }
          >
            {m === "preset" ? "Presets" : "Advanced (cron)"}
          </button>
        ))}
      </div>

      {mode === "preset" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => patch({ preset: p })}
                className={
                  parts.preset === p
                    ? "rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary"
                }
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {parts.preset !== "hourly" && (
              <div className="space-y-1">
                <Label htmlFor="sch-time">Time</Label>
                <input
                  id="sch-time"
                  type="time"
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                  value={`${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    patch({ hour: h || 0, minute: m || 0 });
                  }}
                />
              </div>
            )}
            {parts.preset === "hourly" && (
              <div className="space-y-1">
                <Label htmlFor="sch-min">Minute past the hour</Label>
                <Input
                  id="sch-min"
                  type="number"
                  className="w-28"
                  value={parts.minute}
                  onChange={(e) => patch({ minute: Number(e.target.value) || 0 })}
                />
              </div>
            )}
            {parts.preset === "weekly" && (
              <div className="space-y-1">
                <Label htmlFor="sch-wd">Day of week</Label>
                <Select
                  id="sch-wd"
                  value={parts.weekday}
                  onChange={(e) => patch({ weekday: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {parts.preset === "monthly" && (
              <div className="space-y-1">
                <Label htmlFor="sch-md">Day of month</Label>
                <Input
                  id="sch-md"
                  type="number"
                  className="w-24"
                  value={parts.monthday}
                  onChange={(e) => patch({ monthday: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="sch-cron">Cron expression</Label>
          <Input
            id="sch-cron"
            className="font-mono"
            value={advancedCron}
            aria-invalid={!isValidCron(advancedCron)}
            onChange={(e) => setAdvancedCron(e.target.value)}
          />
        </div>
      )}

      <div className="rounded-md bg-muted px-3 py-2">
        <CronPreview cron={cron} />
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{cron} · {timezone}</p>
      </div>

      {/* Per-schedule parameters */}
      <div className="space-y-2">
        <Label>Parameters</Label>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="key"
              value={r.key}
              onChange={(e) =>
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))
              }
            />
            <Input
              placeholder="value"
              value={r.value}
              onChange={(e) =>
                setRows((rs) => rs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
              }
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove parameter"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])}>
          <Plus className="h-4 w-4" />
          Add parameter
        </Button>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={!valid || save.isPending}>
          {editing ? "Save changes" : "Create schedule"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {!valid && <span className="text-xs text-status-failed">Fix the name and schedule first.</span>}
      </div>
    </div>
  );
}
