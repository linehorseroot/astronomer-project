# AstroFlow Console

The business-facing UI for AstroFlow — build pipelines visually, watch them run live,
schedule them without code, and re-run any task. Next.js (App Router) + TypeScript, built
UI-first against a typed data contract and a mock data layer, so every surface works with
no backend. See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and
[../docs/ROADMAP.md](../docs/ROADMAP.md).

## Quickstart

```bash
pnpm install
pnpm dev            # http://localhost:3000  (mock data by default)
```

Set `NEXT_PUBLIC_API_MODE=live` to target a backend (Phase 6). Copy `.env.example` to
`.env.local` to configure.

## Scripts

```bash
pnpm dev         # dev server
pnpm build       # production build
pnpm start       # serve production build
pnpm lint        # eslint
pnpm typecheck   # tsc --noEmit
```

## Layout

```
app/                     App Router routes (dashboard, workflows, templates, schedules, runs)
  layout.tsx             shell + providers (theme + TanStack Query)
  providers.tsx          client providers
lib/
  contract/              Zod schemas + types — the single source of truth
  adapters/              MockAdapter (seeded + event simulator) and HttpAdapter (stub)
  query/                 TanStack Query provider, keys, hooks
components/
  shell/                 AppShell, SideNav, TopBar, ThemeToggle, CommandPalette (⌘K)
  ui/                    primitives (Button, Card, PageHeader)
  status/                StatusBadge (driven by shared status tokens)
features/                graph · builder · templates · schedules · runs (filled per phase)
```

## What's in Phase 0

- The typed **data contract** (`lib/contract`): `Workflow`/`WorkflowSpec`, `TaskNode`,
  `TaskTemplate`, `Schedule`, `Run`, `TaskInstance`, `RerunRequest`, and the
  `LifecycleEvent` stream (keyed by `execution_id`).
- The **adapter seam** (`lib/adapters`): a seeded `MockAdapter` with an event **simulator**,
  and an `HttpAdapter` stub — selected by `NEXT_PUBLIC_API_MODE`.
- The **app shell**: nav, top bar, theme toggle, ⌘K command palette, routing.
- Working screens against mock data: dashboard, workflow catalog + detail, template catalog,
  runs list + run detail (with a "Watch live (simulated)" demo of the event path).

Next phases (live React Flow graph, builder, scheduling, re-run) plug into this seam without
changing the contract. See [../docs/ROADMAP.md](../docs/ROADMAP.md).
