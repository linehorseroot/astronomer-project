"use client";

import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { describeCron } from "./cron";

/** Plain-English rendering of a cron expression. */
export function CronPreview({ cron }: { cron: string }) {
  const { text, error } = describeCron(cron);
  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs",
        error ? "text-status-failed" : "text-muted-foreground"
      )}
    >
      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
      {error ? text : text}
    </p>
  );
}
