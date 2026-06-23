"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const COMMANDS = [
  { label: "Go to Dashboard", href: "/" },
  { label: "Go to Workflows", href: "/workflows" },
  { label: "Go to Templates", href: "/templates" },
  { label: "Go to Schedules", href: "/schedules" },
  { label: "Go to Runs", href: "/runs" },
];

/** Minimal ⌘K command palette (Phase 0). A full Radix/cmdk version lands later. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;
  const results = COMMANDS.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search commands…"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="max-h-72 overflow-auto p-1">
          {results.map((c) => (
            <li key={c.href}>
              <button
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  router.push(c.href);
                  setOpen(false);
                }}
              >
                {c.label}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">No commands.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
