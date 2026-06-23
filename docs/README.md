# AstroFlow — Documentation

> A business-friendly platform on top of Astronomer / Apache Airflow. Build pipelines
> visually, watch them run live like AWS Step Functions, schedule them without code,
> and re-run any task with one click.

**Status:** Pre-build (docs) · **Owner:** Platform Team · **Last updated:** 2026-06-21

---

## What this is

AstroFlow wraps Astronomer so that non-technical users can compose, schedule, observe,
and re-run data pipelines through a single graceful UI — without touching cron, code, or
the raw Airflow interface. Airflow remains the execution engine; AstroFlow is the
interface and control plane.

The first thing we build is the **Console UI** (Next.js), which includes a
**drag-and-drop dynamic workflow builder** and an extensive **task-template library**.
The Console runs standalone against mock/in-memory data first, then wires to the backend.

## Headline capabilities

- **Live workflow graph** — every pipeline rendered as an animated graph that updates in
  real time as tasks start, succeed, fail, and retry.
- **Dynamic workflow builder** — a drag-and-drop canvas where users build workflows from
  reusable **task templates**, connect them into a DAG, configure parameters, validate,
  and publish a runnable pipeline. See [WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md).
- **Task templates** — a governed catalog of parameterized, reusable task building blocks
  (SQL load, HTTP call, Python transform, sensor, notification, etc.). See
  [TASK_TEMPLATES.md](TASK_TEMPLATES.md).
- **Self-service scheduling** — friendly recurrence editor; multiple schedules per
  workflow.
- **Granular re-run** — re-run a whole run, a branch, or a single failed task, with
  preview-then-confirm and full audit history.
- **Enterprise-ready** — SSO, RBAC, multi-tenancy, audit, observability.

## How it runs (at a glance)

**Airflow orchestrates; it does not compute.** Operators are thin deferrable shims that
dispatch a command and defer; a separate **Execution Engine** does the actual work, and a
**Controller** resolves each task and drives the live UI. This deferred-execution model is
the authoritative runtime design — see [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md).

## How the docs fit together

| Document | Purpose |
|---|---|
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | **Authoritative:** Deferred-execution model, three OpenShift namespaces, execution_id correlation, startup handshake, two-lane resumption (trigger events + REST control). |
| [CUSTOM_OPERATORS.md](CUSTOM_OPERATORS.md) | Custom deferrable operators — manual intervention, approval gates, file watchers, Kafka connectors, HTTP integrations, extensibility. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Console-first build strategy: UI first against mock data, contract-driven design, adapter pattern for live backend. |
| [WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md) | Drag-and-drop dynamic DAG builder — model, interactions, validation, compilation to Airflow. |
| [TASK_TEMPLATES.md](TASK_TEMPLATES.md) | Task-template library — schema, governance, starter catalog. |
| [CONSOLE_UI.md](CONSOLE_UI.md) | Console surfaces, routes, components, design language. |
| [PERFORMANCE.md](PERFORMANCE.md) | Performance budgets and engineering standards for an "extremely fast" app. |
| [ROADMAP.md](ROADMAP.md) | Console-first phased build plan. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Dev setup, coding standards, conventions. |

> The dynamic UI workflow builder and first-class task templates were originally listed as
> v1 *non-goals* in the platform design. We have since promoted them to first-class v1
> features; the new behavior, guardrails, and how they reconcile with "self-service with
> guardrails" are described in [WORKFLOW_BUILDER.md](WORKFLOW_BUILDER.md).

## Quickstart (Console, once scaffolded)

```bash
cd console
pnpm install
pnpm dev            # http://localhost:3000  (runs against mock data by default)
```

The Console ships with a mock data layer so the entire UI — live graph, builder, task
templates, scheduling, re-run — is explorable without any backend running. Set
`NEXT_PUBLIC_API_MODE=live` to point it at a running backend.

## Tech stack

`Next.js (App Router) · TypeScript · React Flow · Tailwind + shadcn/ui · TanStack Query ·
Zod` on the frontend; `Python · FastAPI · Kafka · Postgres · Redis` on the backend;
`Astronomer / Apache Airflow` as the engine.
