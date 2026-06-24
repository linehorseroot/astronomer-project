# AstroFlow — Console UI

**Last updated:** 2026-06-21 · **Status:** Spec for v1

The Console is the only surface business users see. It is a Next.js (App Router) +
TypeScript application built for speed, clarity, and trust. This document covers the
surfaces, routes, component inventory, and design language.

---

## 1. Surfaces

1. **Dashboard** — health at a glance: success rate, currently running, failures needing
   attention, SLA misses, recent activity.
2. **Workflows catalog** — browse workflows the user can see, grouped/filterable by tenant,
   owner, status, and schedule state. Entry point to build, view, schedule, and run.
3. **Workflow detail + Live Graph** — the centerpiece. React Flow graph that animates in
   real time as a run progresses. Click a node for logs, duration, params, attempts.
4. **Workflow Builder** — the drag-and-drop canvas for composing workflows from task
   templates. See [WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md).
5. **Task Templates catalog** — browse the governed template library; see schema, docs,
   and where each is used. See [TASK_TEMPLATES.md](TASK_TEMPLATES.md).
6. **Schedule Builder** — friendly recurrence editor (presets + advanced cron preview in
   plain English), parameter form, multiple schedules per workflow.
7. **Run History & Re-run** — timeline of runs, per-task drill-down, granular re-run
   controls with affected-node preview.
8. **Action inbox** — manual-intervention and approval-gate steps surface here as action
   cards (description, custom fields, Continue / Approve / Reject), routed by role. These are
   how the operators in [CUSTOM_OPERATORS.md](CUSTOM_OPERATORS.md) §2.1–2.2 pause a run for a
   human and resume it.

## 2. Routes (App Router)

```
/                              Dashboard
/workflows                     Catalog
/workflows/[id]                Detail + live graph
/workflows/[id]/builder        Drag-and-drop builder
/workflows/[id]/schedules      Schedules for a workflow
/templates                     Task-template catalog
/templates/[key]               Template detail
/runs/[runId]                  Run detail + re-run
/settings                      Profile, theme, tenant switch
```

## 3. Component inventory (key pieces)

| Area | Components |
|---|---|
| **Shell** | `AppShell`, `SideNav`, `TopBar`, `TenantSwitcher`, `ThemeToggle`, `CommandPalette` (⌘K) |
| **Graph** | `LiveGraph`, `StatusNode`, `AnimatedEdge`, `NodeDrawer` (logs/params/attempts), `StatusLegend`, `GraphMiniMap` |
| **Builder** | `BuilderCanvas`, `NodePalette`, `TemplateCard`, `Inspector`, `SchemaForm`, `ProblemsPanel`, `VersionBar`, `EdgeTriggerSelect` |
| **Templates** | `TemplateCatalog`, `TemplateDetail`, `SchemaViewer`, `UsageList` |
| **Schedules** | `RecurrenceEditor`, `CronPreview` (plain English), `ScheduleList`, `ParamForm` |
| **Runs** | `RunTimeline`, `TaskDrilldown`, `RerunMenu`, `AffectedNodesPreview`, `AttemptDiff` |
| **Primitives** | shadcn/ui: `Button`, `Dialog`, `Sheet`, `Tabs`, `Tooltip`, `Badge`, `Toast`, `Table`, `Command` |

## 4. Status semantics (single source of color)

One color map, used everywhere (graph, badges, timelines, dashboard):

| State | Meaning | Token |
|---|---|---|
| Queued | Waiting to start | `--status-queued` (slate) |
| Running | Executing | `--status-running` (blue, animated) |
| Deferred | Dispatched to the Execution Engine; awaiting result | `--status-deferred` (violet) |
| Success | Completed OK | `--status-success` (green) |
| Failed | Errored | `--status-failed` (red) |
| Retrying | Failed, will retry | `--status-retrying` (amber) |
| Skipped | Not executed by design | `--status-skipped` (gray) |
| Upstream failed | Blocked by a failed dependency | `--status-upstream` (muted red) |

Motion conveys state change only — a node pulses when it starts, an edge "flows" when data
passes. No decorative animation.

## 5. Design language

- Calm, dense-but-uncluttered enterprise aesthetic (Linear / Vercel / Datadog lineage).
- Consistent spacing scale, restrained palette, status colors reserved for status.
- **Accessibility (WCAG 2.1 AA):** keyboard-navigable graph and builder, visible focus,
  sufficient contrast, ARIA on custom nodes, reduced-motion support.
- **Dark/light themes** via CSS variables; status semantics hold in both.
- **Real-time without jank:** optimistic UI + reconciliation; events coalesced per frame.

## 6. Data access

All screens read/write through the typed **data contract** (Zod) via TanStack Query.
Default `MockAdapter` makes every surface fully interactive offline; `HttpAdapter` wires to
the backend later with no component changes. See [ARCHITECTURE.md](ARCHITECTURE.md).

**Live graph subscription:** The Console subscribes to task-lifecycle events keyed by `execution_id` (the Controller's business-level run correlation ID), not Airflow's internal `dag_execution_id`. This ensures the UI is decoupled from Airflow internals and can be driven by either the mock simulator or the real Kafka → Controller fan-out. See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for the full execution_id model.

## 7. Empty, loading, and error states

Every surface defines all three explicitly:
- **Loading:** skeletons that match final layout (no spinner-only screens).
- **Empty:** purposeful empty states with a primary action (e.g. "Create your first
  workflow").
- **Error:** inline, recoverable, with retry; never a blank page.

UX copy follows the conventions in the design plugin's `ux-copy` guidance — short, clear,
action-oriented.

## 8. Performance expectations

The Console targets the budgets in [PERFORMANCE.md](PERFORMANCE.md): fast first paint,
instant navigation, smooth 60fps graph animation even on large DAGs.
