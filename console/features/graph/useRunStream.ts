"use client";

/**
 * Subscribes to the lifecycle-event stream and folds it into run state, coalescing
 * bursts of events into one state update per animation frame (so wide DAGs don't
 * cause render storms). Same path for mock simulator and live WS — the component
 * can't tell them apart. See docs/PERFORMANCE.md §2–3, docs/ARCHITECTURE.md §3.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getAdapter } from "@/lib/adapters";
import type { LifecycleEvent, Run, Workflow } from "@/lib/contract";
import {
  initFromRun,
  initFromWorkflow,
  isComplete,
  reduceMany,
  type RunState,
} from "./runReducer";

export interface UseRunStream {
  state: RunState;
  running: boolean;
  start: () => void;
  stop: () => void;
}

export function useRunStream(workflow: Workflow, initialRun?: Run): UseRunStream {
  const [state, setState] = useState<RunState>(() =>
    initialRun ? initFromRun(initialRun) : initFromWorkflow(workflow)
  );
  const [running, setRunning] = useState(false);

  const stateRef = useRef(state);
  const bufferRef = useRef<LifecycleEvent[]>([]);
  const rafRef = useRef<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    bufferRef.current = [];
    setRunning(false);
  }, []);

  // Flush buffered events once per frame; stop when the run reaches terminal state.
  const flush = useCallback(() => {
    rafRef.current = null;
    const batch = bufferRef.current;
    if (batch.length === 0) return;
    bufferRef.current = [];
    const next = reduceMany(stateRef.current, batch);
    stateRef.current = next;
    setState(next);
    if (isComplete(next)) stop();
  }, [stop]);

  const start = useCallback(() => {
    stop();
    const fresh = initFromWorkflow(workflow); // reset every node to queued
    stateRef.current = fresh;
    setState(fresh);
    setRunning(true);
    const execution_id = `exec_${Date.now()}`;
    unsubRef.current = getAdapter().subscribe(
      { execution_id, workflow_id: workflow.id },
      (e: LifecycleEvent) => {
        bufferRef.current.push(e);
        if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
      }
    );
  }, [workflow, flush, stop]);

  // Tear down subscription + pending frame on unmount (no state writes here).
  useEffect(() => {
    return () => {
      unsubRef.current?.();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { state, running, start, stop };
}
