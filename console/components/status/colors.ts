import type { TaskStatus } from "@/lib/contract";

/** Map each status to its shared CSS token (single source of color — CONSOLE_UI §4). */
const VAR: Record<TaskStatus, string> = {
  queued: "--status-queued",
  running: "--status-running",
  success: "--status-success",
  failed: "--status-failed",
  retrying: "--status-retrying",
  skipped: "--status-skipped",
  upstream_failed: "--status-upstream",
  deferred: "--status-deferred",
};

/**
 * Resolve a status color from the shared tokens at runtime, so non-CSS consumers
 * (e.g. the React Flow MiniMap's nodeColor) stay theme-aware and never duplicate
 * the palette. Client-only; falls back to slate during SSR.
 */
export function statusColor(status: TaskStatus): string {
  if (typeof window === "undefined") return "#64748b";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(VAR[status] ?? "--status-queued")
    .trim();
  return value || "#64748b";
}
