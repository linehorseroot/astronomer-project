"use client";

/**
 * Builder draft store (Zustand) scoped to the builder route — nodes, edges,
 * selection, and undo/redo history — serialized to a WorkflowSpec. React Flow
 * reads/writes through it. See docs/ARCHITECTURE.md §5, docs/WORKFLOW_BUILDER.md.
 */
import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type { TaskTemplate, Workflow } from "@/lib/contract";
import { defaultsFor, parseSchema } from "@/features/templates/schema";
import { wouldCycle } from "./validate";

export const TRIGGER_RULES = ["all_success", "all_done", "one_failed", "one_success"] as const;
export type TriggerRule = (typeof TRIGGER_RULES)[number];

export interface BuilderNodeData {
  templateKey: string;
  templateVersion: string;
  displayName: string;
  params: Record<string, unknown>;
  retries?: number;
  timeoutSeconds?: number;
  [key: string]: unknown;
}
export type BNode = Node<BuilderNodeData, "builder">;
export interface BuilderEdgeData {
  triggerRule: TriggerRule;
  [key: string]: unknown;
}
export type BEdge = Edge<BuilderEdgeData>;

interface Snapshot {
  nodes: BNode[];
  edges: BEdge[];
  name: string;
}

interface BuilderState {
  workflowId: string;
  tenantId: string;
  owner: string;
  name: string;
  baseVersion: number;
  nodes: BNode[];
  edges: BEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  connectError: string | null;
  dirty: boolean;
  past: Snapshot[];
  future: Snapshot[];
  seq: number;

  load: (wf: Workflow) => void;
  onNodesChange: (changes: NodeChange<BNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<BEdge>[]) => void;
  onConnect: (c: Connection) => void;
  beginInteraction: () => void; // snapshot before a drag
  addTemplateNode: (tpl: TaskTemplate, position: { x: number; y: number }) => void;
  setSelected: (nodeId: string | null, edgeId: string | null) => void;
  updateSelectedNode: (patch: Partial<BuilderNodeData>) => void;
  setEdgeTrigger: (edgeId: string, rule: TriggerRule) => void;
  deleteSelection: () => void;
  duplicateSelectedNode: () => void;
  setName: (name: string) => void;
  clearConnectError: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  toWorkflow: (status?: Workflow["status"], version?: number) => Workflow;
}

function snapshot(s: BuilderState): Snapshot {
  return { nodes: s.nodes, edges: s.edges, name: s.name };
}

export const useBuilder = create<BuilderState>((set, get) => ({
  workflowId: "",
  tenantId: "",
  owner: "",
  name: "",
  baseVersion: 1,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  connectError: null,
  dirty: false,
  past: [],
  future: [],
  seq: 0,

  load: (wf) =>
    set({
      workflowId: wf.id,
      tenantId: wf.tenant_id,
      owner: wf.owner,
      name: wf.name,
      baseVersion: wf.version,
      nodes: wf.nodes.map((n) => ({
        id: n.node_id,
        type: "builder",
        position: n.position,
        data: {
          templateKey: n.template_key,
          templateVersion: n.template_version,
          displayName: n.display_name,
          params: n.params,
          retries: n.retries,
          timeoutSeconds: n.timeout_seconds,
        },
      })),
      edges: wf.edges.map((e, i) => ({
        id: `e${i}-${e.from}-${e.to}`,
        source: e.from,
        target: e.to,
        data: { triggerRule: e.trigger_rule as TriggerRule },
        label: e.trigger_rule === "all_success" ? undefined : e.trigger_rule,
      })),
      selectedNodeId: null,
      selectedEdgeId: null,
      connectError: null,
      dirty: false,
      past: [],
      future: [],
      seq: wf.nodes.length,
    }),

  onNodesChange: (changes) => set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) => set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  beginInteraction: () =>
    set((s) => ({ past: [...s.past, snapshot(s)], future: [] })),

  onConnect: (c) => {
    const s = get();
    if (!c.source || !c.target) return;
    if (wouldCycle(s.edges, c.source, c.target)) {
      set({ connectError: "That connection would create a cycle. Workflows must be acyclic." });
      return;
    }
    if (s.edges.some((e) => e.source === c.source && e.target === c.target)) return;
    set({
      past: [...s.past, snapshot(s)],
      future: [],
      connectError: null,
      dirty: true,
      edges: addEdge({ ...c, data: { triggerRule: "all_success" } }, s.edges),
    });
  },

  addTemplateNode: (tpl, position) => {
    const s = get();
    const seq = s.seq + 1;
    const id = `n${seq}`;
    const node: BNode = {
      id,
      type: "builder",
      position,
      data: {
        templateKey: tpl.key,
        templateVersion: tpl.version,
        displayName: tpl.display_name,
        params: defaultsFor(parseSchema(tpl.param_schema)),
        retries: tpl.defaults?.retries,
        timeoutSeconds: tpl.defaults?.timeout_seconds,
      },
    };
    set({
      past: [...s.past, snapshot(s)],
      future: [],
      seq,
      dirty: true,
      nodes: [...s.nodes, node],
      selectedNodeId: id,
      selectedEdgeId: null,
    });
  },

  setSelected: (nodeId, edgeId) => set({ selectedNodeId: nodeId, selectedEdgeId: edgeId }),

  updateSelectedNode: (patch) => {
    const s = get();
    if (!s.selectedNodeId) return;
    set({
      past: [...s.past, snapshot(s)],
      future: [],
      dirty: true,
      nodes: s.nodes.map((n) =>
        n.id === s.selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    });
  },

  setEdgeTrigger: (edgeId, rule) => {
    const s = get();
    set({
      past: [...s.past, snapshot(s)],
      future: [],
      dirty: true,
      edges: s.edges.map((e) =>
        e.id === edgeId
          ? { ...e, data: { ...e.data, triggerRule: rule }, label: rule === "all_success" ? undefined : rule }
          : e
      ),
    });
  },

  deleteSelection: () => {
    const s = get();
    if (s.selectedNodeId) {
      const id = s.selectedNodeId;
      set({
        past: [...s.past, snapshot(s)],
        future: [],
        dirty: true,
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: null,
      });
    } else if (s.selectedEdgeId) {
      const id = s.selectedEdgeId;
      set({
        past: [...s.past, snapshot(s)],
        future: [],
        dirty: true,
        edges: s.edges.filter((e) => e.id !== id),
        selectedEdgeId: null,
      });
    }
  },

  duplicateSelectedNode: () => {
    const s = get();
    const src = s.nodes.find((n) => n.id === s.selectedNodeId);
    if (!src) return;
    const seq = s.seq + 1;
    const id = `n${seq}`;
    const copy: BNode = {
      ...src,
      id,
      position: { x: src.position.x + 40, y: src.position.y + 40 },
      data: { ...src.data, displayName: `${src.data.displayName} copy`, params: { ...src.data.params } },
      selected: false,
    };
    set({
      past: [...s.past, snapshot(s)],
      future: [],
      seq,
      dirty: true,
      nodes: [...s.nodes, copy],
      selectedNodeId: id,
    });
  },

  setName: (name) => set({ name, dirty: true }),
  clearConnectError: () => set({ connectError: null }),

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const prev = s.past[s.past.length - 1];
    set({
      past: s.past.slice(0, -1),
      future: [snapshot(s), ...s.future],
      nodes: prev.nodes,
      edges: prev.edges,
      name: prev.name,
      dirty: true,
    });
  },
  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const next = s.future[0];
    set({
      past: [...s.past, snapshot(s)],
      future: s.future.slice(1),
      nodes: next.nodes,
      edges: next.edges,
      name: next.name,
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),

  toWorkflow: (status = "draft", version) => {
    const s = get();
    return {
      spec_version: "1.0",
      id: s.workflowId,
      name: s.name,
      tenant_id: s.tenantId,
      owner: s.owner,
      status,
      version: version ?? s.baseVersion,
      nodes: s.nodes.map((n) => ({
        node_id: n.id,
        template_key: n.data.templateKey,
        template_version: n.data.templateVersion,
        display_name: n.data.displayName,
        params: n.data.params,
        retries: n.data.retries,
        timeout_seconds: n.data.timeoutSeconds,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      })),
      edges: s.edges.map((e) => ({
        from: e.source,
        to: e.target,
        trigger_rule: e.data?.triggerRule ?? "all_success",
      })),
      updated_at: new Date().toISOString(),
    };
  },
}));
