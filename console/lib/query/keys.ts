/** Centralized query keys so caches are consistent and invalidation is simple. */
export const qk = {
  templates: ["templates"] as const,
  template: (key: string) => ["templates", key] as const,
  workflows: ["workflows"] as const,
  workflow: (id: string) => ["workflows", id] as const,
  schedules: (workflowId: string) => ["schedules", workflowId] as const,
  runs: ["runs"] as const,
  run: (executionId: string) => ["runs", executionId] as const,
};
