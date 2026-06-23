"use client";

import { getAdapter } from "@/lib/adapters";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar() {
  const mode = getAdapter().mode;
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
      <div className="text-sm text-muted-foreground">
        Press{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd> to
        search
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {mode === "mock" ? "Mock data" : "Live"}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
