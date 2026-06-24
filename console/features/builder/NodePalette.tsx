"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTemplates } from "@/lib/query/hooks";
import { useBuilder } from "./store";

/** Left palette: searchable, approved templates. Drag onto canvas or click to add. */
export function NodePalette() {
  const { data } = useTemplates();
  const [q, setQ] = useState("");
  const addTemplateNode = useBuilder((s) => s.addTemplateNode);

  const approved = (data ?? []).filter((t) => t.governance.approval === "approved");
  const needle = q.trim().toLowerCase();
  const filtered = approved.filter((t) =>
    !needle ? true : `${t.display_name} ${t.category} ${t.key}`.toLowerCase().includes(needle)
  );

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates…"
            className="h-8 pl-8"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-auto p-2">
        {filtered.map((t) => (
          <button
            key={t.key}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/astroflow-template", t.key);
              e.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => addTemplateNode(t, { x: 160 + Math.random() * 120, y: 120 + Math.random() * 140 })}
            className="w-full cursor-grab rounded-md border border-border p-2 text-left transition-colors hover:border-primary active:cursor-grabbing"
          >
            <div className="text-sm font-medium">{t.display_name}</div>
            <div className="text-[11px] text-muted-foreground">{t.category}</div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">No templates.</p>
        )}
      </div>
    </aside>
  );
}
