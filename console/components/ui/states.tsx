import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

/** Inline, recoverable error with retry (CONSOLE_UI §7 — never a blank page). */
export function ErrorState({
  message = "Couldn’t load this. Please try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-status-failed/30 bg-status-failed/5 p-4 text-sm">
      <div className="flex items-center gap-2 text-status-failed">
        <AlertTriangle className="h-4 w-4" />
        {message}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** Purposeful empty state with an optional primary action (CONSOLE_UI §7). */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
