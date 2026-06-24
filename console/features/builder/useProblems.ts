"use client";

import { useMemo } from "react";
import { useTemplates } from "@/lib/query/hooks";
import { useBuilder } from "./store";
import { validateSpec, type Problem } from "./validate";

/** Continuous validation result — shared by the problems panel and the publish gate. */
export function useProblems(): Problem[] {
  const nodes = useBuilder((s) => s.nodes);
  const edges = useBuilder((s) => s.edges);
  const name = useBuilder((s) => s.name);
  const { data: templates } = useTemplates();

  return useMemo(
    () =>
      validateSpec(
        name,
        nodes.map((n) => ({
          id: n.id,
          templateKey: n.data.templateKey,
          displayName: n.data.displayName,
          params: n.data.params,
        })),
        edges.map((e) => ({ source: e.source, target: e.target })),
        templates ?? []
      ),
    [name, nodes, edges, templates]
  );
}
