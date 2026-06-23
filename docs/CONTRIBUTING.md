# Contributing to AstroFlow

**Last updated:** 2026-06-21

This guide covers local setup, standards, and conventions. The goal is a fast, consistent,
high-quality codebase that any contributor can move in confidently.

---

## 1. Prerequisites

- **Node** ≥ 20 and **pnpm** ≥ 9 (Console).
- **Python** ≥ 3.11 and **uv** or **poetry** (backend/core, later phases).
- **Docker** (for the local Airflow/Kafka/Postgres stack, later phases).

## 2. Local setup (Console)

```bash
cd console
pnpm install
pnpm dev          # http://localhost:3000, mock data by default
```

Environment:

| Var | Values | Default | Meaning |
|---|---|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` \| `live` | `mock` | Data adapter selection |
| `NEXT_PUBLIC_API_URL` | URL | — | Backend base URL (live mode) |
| `NEXT_PUBLIC_WS_URL` | URL | — | WebSocket URL (live mode) |

## 3. Scripts

```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm start          # serve production build
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # unit/component tests
pnpm test:e2e       # end-to-end (mock mode)
pnpm analyze        # bundle analysis
```

## 4. Coding standards

- **TypeScript strict.** No `any` without a written reason; prefer inference and Zod-derived
  types.
- **Validation at the boundary.** All external data parsed with Zod; the contract types are
  the single source of truth (see [ARCHITECTURE.md](ARCHITECTURE.md)).
- **Server Components by default;** add `"use client"` only for interactive islands.
- **Feature-sliced structure** (`features/<area>/`); shared primitives in `components/ui/`.
- **Accessibility is not optional** — keyboard support, focus management, ARIA, contrast,
  reduced-motion. Targets WCAG 2.1 AA (see the `accessibility-review` skill).
- **Performance budgets are enforced** (see [PERFORMANCE.md](PERFORMANCE.md)); a PR that
  busts a ceiling fails CI.
- **Status semantics** come from the shared token map — never hardcode status colors.

## 5. Commits & branches

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`.
- Short-lived feature branches; small, reviewable PRs.
- Every PR: passing lint, typecheck, tests, and budget checks; a screenshot or clip for UI
  changes.

## 6. Testing strategy

- **Unit/component:** logic, reducers (event folding), schema forms, validation.
- **Builder invariants:** DAG/acyclicity, cycle rejection, param validation.
- **E2E (mock mode):** build a workflow, publish, watch a simulated run, re-run a task.
- **Visual/Storybook:** custom nodes, status states, empty/loading/error states.

## 7. File-safety convention

This workspace follows a strict rule: **do not delete or overwrite existing files** without
explicit sign-off. Prefer creating new files; if a change seems to require removing or
replacing something, raise it in the PR description and get confirmation first.

## 8. Where things live

| Concern | Location |
|---|---|
| Data contract (Zod) | `console/lib/contract/` |
| Mock + HTTP adapters, event simulator | `console/lib/adapters/` |
| Live graph | `console/features/graph/` |
| Workflow builder | `console/features/builder/` |
| Task templates | `console/features/templates/` |
| Schedules | `console/features/schedules/` |
| Runs & re-run | `console/features/runs/` |
| UI primitives | `console/components/ui/` |

## 9. Docs

Keep docs current with behavior. The doc set:
[README](README.md) · [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md) ·
[CUSTOM_OPERATORS](CUSTOM_OPERATORS.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[WORKFLOW_BUILDER](WORKFLOW_BUILDER.md) · [TASK_TEMPLATES](TASK_TEMPLATES.md) ·
[CONSOLE_UI](CONSOLE_UI.md) · [PERFORMANCE](PERFORMANCE.md) · [ROADMAP](ROADMAP.md).
