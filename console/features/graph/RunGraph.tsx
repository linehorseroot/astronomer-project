"use client";

import { useState } from "react";
import { Play, Square } from "lucide-react";
import type { Run, Workflow } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { LiveGraph } from "./LiveGraph";
import { NodeDrawer } from "./NodeDrawer";
import { StatusLegend } from "./StatusLegend";
import { useRunStream } from "./useRunStream";

/**
 * The Phase 1 live-graph surface: a React Flow graph that animates as a run
 * progresses, driven by the lifecycle-event stream (mock simulator now, live WS
 * later). Reused on the workflow-detail and run-detail pages.
 */
export function RunGraph({
  workflow,
  run,
  startLabel = "Simulate run",
}: {
  workflow: Workflow;
  run?: Run;
  startLabel?: string;
}) {
  const { state, running, start, stop } = useRunStream(workflow, run);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <StatusLegend />
        <Button
          size="sm"
          variant={running ? "outline" : "primary"}
          onClick={running ? stop : start}
        >
          {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Stop" : startLabel}
        </Button>
      </div>

      <LiveGraph workflow={workflow} state={state} onSelect={setSelected} />

      <NodeDrawer
        workflow={workflow}
        state={state}
        selectedId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
