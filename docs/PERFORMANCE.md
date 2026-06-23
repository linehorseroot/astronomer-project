# AstroFlow — Performance Standards

**Last updated:** 2026-06-20

"Extremely fast" is a requirement, not an aspiration. This document sets concrete budgets
and the engineering practices that hold us to them. Performance is reviewed like
correctness — regressions block merge.

---

## 1. Budgets (Console)

| Metric | Target | Hard ceiling |
|---|---|---|
| Largest Contentful Paint (LCP) | < 1.5 s | 2.5 s |
| Interaction to Next Paint (INP) | < 100 ms | 200 ms |
| Cumulative Layout Shift (CLS) | < 0.05 | 0.1 |
| Time to Interactive (mid-tier laptop) | < 2.0 s | 3.0 s |
| Route navigation (cached) | < 150 ms | 300 ms |
| Initial JS shipped (gzipped, per route) | < 180 KB | 250 KB |
| Graph animation frame rate | 60 fps | ≥ 50 fps |
| Live-event render latency (event → node update) | < 50 ms | 120 ms |

Budgets are enforced in CI (Lighthouse CI + bundle-size checks). A PR that exceeds a
ceiling fails.

## 2. Frontend practices

- **Server Components by default**; client components only for interactive islands
  (graph, builder, forms). Keeps JS payloads small.
- **Route-level code splitting.** The builder, graph, and template catalog load
  independently; visiting the dashboard never downloads builder code.
- **Memoized custom nodes.** React Flow nodes are `memo`-wrapped and read only their own
  slice of run state, so a single task event re-renders one node, not the graph.
- **Event coalescing.** Bursts of lifecycle events are batched and flushed once per
  animation frame via `requestAnimationFrame`, preventing render storms on wide DAGs.
- **Virtualization.** Large lists (runs, templates, logs) and large graphs use
  virtualized rendering; off-screen nodes are not painted.
- **Aggressive caching.** Templates and workflow metadata are cached by TanStack Query with
  long stale times; navigation feels instant. Optimistic mutations with reconciliation.
- **Image/font discipline.** System font stack or one subset variable font; no layout
  shift from late fonts; icons as inline SVG sprites.
- **No blocking third parties.** Analytics and non-critical scripts deferred.

## 3. Real-time without jank

- Single WebSocket per session, multiplexed by room (`run` / `dag` / `tenant`); subscribe
  only to what's on screen.
- An event-sourced reducer folds events into per-task state; the graph reads derived
  status, never raw events.
- Reconnect with backoff and a state resync on reconnect so the UI self-heals after a drop.
- SSE fallback where proxies block WebSockets.

## 4. Backend & data (when wired)

- REST responses for catalog/list endpoints are paginated and cacheable; ETags where
  sensible.
- WebSocket fan-out scoped per room so a user watching one run never receives the whole
  tenant's traffic.
- Horizontal scale via a Redis/Kafka backplane for the WS gateway.
- The live view is event-driven (push), not polled.

## 5. Measurement & guardrails

- **Lighthouse CI** on every PR against the budgets above.
- **Bundle analyzer** check; per-route size ceilings enforced.
- **Web Vitals** (LCP, INP, CLS) captured from real sessions and dashboarded.
- **Profiling gates** for the graph: a synthetic 500-node DAG replay must hold ≥ 50 fps.
- Performance regressions are treated as bugs and block release.

## 6. Definition of "fast" for this product

A user opens a workflow and the live graph paints and starts animating within a second; the
builder canvas responds to drag and connect with zero perceptible lag; switching between
workflows is instant because metadata is cached. Nothing spins; nothing janks; nothing
shifts under the cursor.
