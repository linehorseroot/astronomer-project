/**
 * Event simulator — replays a realistic run by emitting task-lifecycle events
 * with believable timing, so the live graph animates exactly as it will in
 * production. Emits the same LifecycleEvent shape as the live WS path.
 * See docs/ARCHITECTURE.md §3.
 */
import type { LifecycleEvent, TaskStatus, Workflow } from "@/lib/contract";

type Emit = (e: LifecycleEvent) => void;

/** Topologically order nodes so events fire start→success down the DAG. */
function topoOrder(wf: Workflow): string[] {
  const incoming = new Map<string, number>();
  wf.nodes.forEach((n) => incoming.set(n.node_id, 0));
  wf.edges.forEach((e) => incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1));

  const queue = wf.nodes.filter((n) => (incoming.get(n.node_id) ?? 0) === 0).map((n) => n.node_id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    wf.edges
      .filter((e) => e.from === id)
      .forEach((e) => {
        const left = (incoming.get(e.to) ?? 0) - 1;
        incoming.set(e.to, left);
        if (left === 0) queue.push(e.to);
      });
  }
  // include any nodes not reached (cycles/orphans) so nothing is dropped
  wf.nodes.forEach((n) => {
    if (!order.includes(n.node_id)) order.push(n.node_id);
  });
  return order;
}

export interface SimHandle {
  stop: () => void;
}

/**
 * Drive a simulated run for `workflow` keyed by `execution_id`. Each node walks
 * QUEUED → STARTED → DEFERRED → SUCCEEDED, with one node optionally retrying.
 */
export function simulateRun(
  workflow: Workflow,
  execution_id: string,
  emit: Emit,
  opts: { stepMs?: number; failNode?: string } = {}
): SimHandle {
  const stepMs = opts.stepMs ?? 900;
  const order = topoOrder(workflow);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  const fire = (
    node_id: string,
    type: LifecycleEvent["type"],
    status: TaskStatus,
    attempt: number,
    delay: number
  ) => {
    timers.push(
      setTimeout(() => {
        if (stopped) return;
        emit({ execution_id, node_id, type, status, attempt, ts: new Date().toISOString() });
      }, delay)
    );
  };

  let t = stepMs;
  for (const node_id of order) {
    const willRetry = node_id === opts.failNode;
    fire(node_id, "TASK_QUEUED", "queued", 1, t);
    t += stepMs;
    fire(node_id, "TASK_STARTED", "running", 1, t);
    t += stepMs / 2;
    fire(node_id, "TASK_DEFERRED", "deferred", 1, t);
    t += stepMs;
    if (willRetry) {
      fire(node_id, "TASK_RETRYING", "retrying", 1, t);
      t += stepMs;
      fire(node_id, "TASK_STARTED", "running", 2, t);
      t += stepMs;
    }
    fire(node_id, "TASK_SUCCEEDED", "success", willRetry ? 2 : 1, t);
    t += stepMs;
  }

  return {
    stop: () => {
      stopped = true;
      timers.forEach(clearTimeout);
    },
  };
}
