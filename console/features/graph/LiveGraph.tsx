"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Workflow } from "@/lib/contract";
import { statusColor } from "@/components/status/colors";
import { StatusNode, type StatusFlowNode } from "./StatusNode";
import type { RunState } from "./runReducer";

const nodeTypes = { status: StatusNode };

function buildNodes(workflow: Workflow, state: RunState): StatusFlowNode[] {
  return workflow.nodes.map((n) => ({
    id: n.node_id,
    type: "status",
    position: n.position,
    data: {
      label: n.display_name,
      templateKey: n.template_key,
      status: state[n.node_id]?.status ?? "queued",
    },
  }));
}

function buildEdges(workflow: Workflow): Edge[] {
  return workflow.edges.map((e, i) => ({
    id: `e${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    animated: false,
    label: e.trigger_rule === "all_success" ? undefined : e.trigger_rule,
  }));
}

export function LiveGraph({
  workflow,
  state,
  onSelect,
}: {
  workflow: Workflow;
  state: RunState;
  onSelect?: (nodeId: string | null) => void;
}) {
  const initialNodes = useMemo(() => buildNodes(workflow, state), [workflow]); // eslint-disable-line react-hooks/exhaustive-deps
  const initialEdges = useMemo(() => buildEdges(workflow), [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState<StatusFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // Update node status; return the same node object when unchanged so React Flow's
  // memoized node skips re-rendering (docs/PERFORMANCE.md §2).
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const status = state[n.id]?.status ?? "queued";
        if (n.data.status === status) return n;
        return { ...n, data: { ...n.data, status } };
      })
    );
  }, [state, setNodes]);

  // An edge "flows" while its upstream task is active.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => {
        const s = state[e.source]?.status;
        const animated = s === "running" || s === "deferred" || s === "retrying";
        if (e.animated === animated) return e;
        return { ...e, animated };
      })
    );
  }, [state, setEdges]);

  return (
    <div className="h-[60vh] w-full overflow-hidden rounded-lg border border-border">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        colorMode="system"
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => statusColor((n.data as StatusFlowNode["data"]).status)}
        />
      </ReactFlow>
    </div>
  );
}
