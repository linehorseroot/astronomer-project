# AstroFlow — Architecture (Console-First)

**Last updated:** 2026-06-21

This document describes the architecture of the build we are doing **first**: a standalone,
extremely fast Console UI that includes the dynamic workflow builder and task-template
library, designed so it can later wire to the real backend with no rewrites. For the full
platform design (core package, event bus, scheduling internals, enterprise concerns) see
the platform design document.

---

## 1. Guiding strategy: UI-first, contract-driven

We build the Console against a **typed data contract** and a **mock implementation** of
that contract. Every screen — live graph, builder, templates, schedules, re-run — works
end to end with in-memory data before any backend exists. When the backend is ready, we
swap the mock adapter for the HTTP/WebSocket adapter; components never change.

```
┌─────────────────────────────────────────────┐
│                Console (Next.js)             │
│  pages / components / React Flow canvas      │
│                    │                         │
│             useQuery / useMutation           │
│                    │                         │
│        ┌───────────┴───────────┐             │
│        │   Data Contract (TS)  │  ← Zod types │
│        └───────────┬───────────┘             │
│        ┌───────────┴───────────┐             │
│   MockAdapter            HttpAdapter         │
│  (in-memory, seeded)    (REST + WS/SSE)      │
└─────────────────────────────────────────────┘
                       │
                  (later) Backend
```

The adapter is selected by `NEXT_PUBLIC_API_MODE` (`mock` | `live`). Default is `mock`.

## 2. Layers

| Layer | Responsibility | Key tech |
|---|---|---|
| **Routing & shell** | App Router layouts, navigation, auth gating, theme | Next.js App Router |
| **Data contract** | Zod schemas + TS types shared by all features; the single definition of `Workflow`, `TaskNode`, `TaskTemplate`, `Schedule`, `Run`, `TaskInstance`, `RerunRequest` | Zod, TypeScript |
| **Data adapters** | `MockAdapter` (seeded in-memory store + simulated live events) and `HttpAdapter` (REST + WebSocket) | TanStack Query |
| **Feature modules** | Self-contained slices: `graph/`, `builder/`, `templates/`, `schedules/`, `runs/`, `dashboard/` | React, React Flow |
| **Design system** | Tokens, primitives, status semantics, motion | Tailwind, shadcn/ui, Radix |

## 3. Real-time model

The live graph subscribes to a stream of task-lifecycle events. The contract defines an
`events.subscribe(scope)` method returning an async iterator / event emitter.

- **Mock mode:** a simulator replays realistic runs — emitting `TASK_QUEUED → TASK_STARTED →
  TASK_SUCCEEDED/FAILED → TASK_RETRYING` with believable timing, so the graph animates
  exactly as it will in production.
- **Live mode:** a WebSocket client (SSE fallback) joins rooms scoped by `run`, `dag`, and
  `tenant`, and feeds the same event shape into the same store.

Because both modes emit the **same event type**, the graph component cannot tell them
apart. This is what lets us perfect the live experience before the backend exists.

## 4. The builder ⇄ engine boundary

The dynamic workflow builder produces a **WorkflowSpec** (a serializable, validated graph
of task-template instances + edges + params). Two things consume it:

1. **The Console** renders and validates it client-side (cycle detection, required params,
   type checks against each template's `param_schema`).
2. **The backend** (later) compiles a published `WorkflowSpec` into an Airflow DAG via the
   dynamic DAG factory. The spec is the contract between "what the user drew" and "what
   Airflow runs."

The builder never emits raw Airflow code. It emits a spec; compilation and guardrails live
server-side. Compilation produces **deferrable** operators that dispatch work to the
Execution Engine and defer — Airflow orchestrates but runs no compute. See
[WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md) §"Compilation" and the deferred-execution model
in [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

## 5. State management

- **Server state** (workflows, runs, templates, schedules): TanStack Query, keyed and
  cached; optimistic updates with reconciliation when authoritative state arrives.
- **Builder canvas state** (nodes, edges, selection, undo/redo): a local store (Zustand)
  scoped to the builder route, serialized to a `WorkflowSpec` draft and autosaved.
- **Live run state**: an event-sourced reducer that folds the lifecycle event stream into
  per-task status; the graph reads from it.

## 6. Why this is fast

Performance is a first-class requirement. Summary (full detail in
[PERFORMANCE.md](PERFORMANCE.md)):

- Server Components for static shell; client islands only where interactivity is needed.
- React Flow with virtualized rendering and memoized custom nodes; only changed nodes
  re-render on each event.
- Event coalescing: bursts of lifecycle events are batched per animation frame.
- Route-level code splitting; the builder and graph load independently.
- Aggressive caching of templates and workflow metadata; instant navigation.

## 7. Folder layout (Console)

```
console/
├── app/                     # App Router routes
│   ├── (dashboard)/page.tsx
│   ├── workflows/
│   │   ├── page.tsx               # catalog
│   │   ├── [id]/page.tsx          # detail + live graph
│   │   └── [id]/builder/page.tsx  # drag-and-drop builder
│   ├── templates/page.tsx
│   ├── runs/[runId]/page.tsx
│   └── layout.tsx
├── lib/
│   ├── contract/            # Zod schemas + TS types
│   ├── adapters/            # mock + http adapters, event simulator
│   └── query/               # TanStack Query setup
├── features/
│   ├── graph/               # React Flow live graph
│   ├── builder/             # canvas, node palette, inspector, validation
│   ├── templates/           # template catalog + forms
│   ├── schedules/           # recurrence editor
│   └── runs/                # history + re-run controls
├── components/ui/           # shadcn/ui primitives
└── styles/                  # tokens, tailwind config
```

## 8. Migration to live backend

When the backend lands:

1. Implement `HttpAdapter` against the documented REST + WS contract.
   - **Key detail:** WebSocket subscriptions are keyed by `execution_id` (the business-level correlation ID minted by the Controller), not Airflow's internal `dag_execution_id`. See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) §1 for the execution_id model.
   - **Event schema:** events carry `execution_id` as a key field so the UI can subscribe by run without seeing Airflow internals.
2. Flip `NEXT_PUBLIC_API_MODE=live`.
3. Keep `MockAdapter` for Storybook, tests, demos, and offline development.

No feature component changes. The contract is the seam. The Console remains agnostic to whether events come from the mock simulator or the real backend's Kafka → Controller fan-out.
