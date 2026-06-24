/**
 * Recurrence helpers: build a cron from friendly presets, and render any cron in
 * plain English (via cronstrue). See docs/CONSOLE_UI.md §1 (CronPreview) and
 * docs/ROADMAP.md Phase 4.
 */
import cronstrue from "cronstrue";

export type Preset = "hourly" | "daily" | "weekly" | "monthly";

export interface RecurrenceParts {
  preset: Preset;
  minute: number;
  hour: number;
  weekday: number; // 0=Sun … 6=Sat
  monthday: number; // 1–31
}

export const DEFAULT_PARTS: RecurrenceParts = {
  preset: "daily",
  minute: 0,
  hour: 2,
  weekday: 1,
  monthday: 1,
};

export const PRESET_LABELS: Record<Preset, string> = {
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
];

export function buildCron(p: RecurrenceParts): string {
  switch (p.preset) {
    case "hourly":
      return `${p.minute} * * * *`;
    case "daily":
      return `${p.minute} ${p.hour} * * *`;
    case "weekly":
      return `${p.minute} ${p.hour} * * ${p.weekday}`;
    case "monthly":
      return `${p.minute} ${p.hour} ${p.monthday} * *`;
  }
}

export function describeCron(cron: string): { text: string; error: boolean } {
  const trimmed = cron.trim();
  if (!trimmed) return { text: "Enter a schedule", error: true };
  try {
    return {
      text: cronstrue.toString(trimmed, {
        throwExceptionOnParseError: true,
        use24HourTimeFormat: true,
        verbose: false,
      }),
      error: false,
    };
  } catch {
    return { text: "Invalid cron expression", error: true };
  }
}

export function isValidCron(cron: string): boolean {
  return !describeCron(cron).error;
}
