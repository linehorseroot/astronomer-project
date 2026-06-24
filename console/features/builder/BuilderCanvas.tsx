"use client";

import { useCallback, type DragEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTemplates } from "@/lib/query/hooks";
import { BuilderNode } from "./BuilderNode";
import { useBuilder } from "./store";

const nodeTypes = { builder: BuilderNode };

function CanvasInner() {
  const nodes = useBuilder((s) => s.nodes);
  const edges = useBuilder((s) => s.edges);
  const onNodesChange = useBuilder((s) => s.onNodesChange);
  const onEdgesChange = useBuilder((s) => s.onEdgesChange);
  const onConnect = useBuilder((s) => s.onConnect);
  const beginInteraction = useBuilder((s) => s.beginInteraction);
  const setSelected = useBuilder((s) => s.setSelected);
  const addTemplateNode = useBuilder((s) => s.addTemplateNode);
  const { data: templates } = useTemplates();
  const { screenToFlowPosition } = useReactFlow();

  const onSelectionChange = useCallback(
    (p: OnSelectionChangeParams) => setSelected(p.nodes[0]?.id ?? null, p.edges[0]?.id ?? null),
    [setSelected]
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const key = e.dataTransfer.getData("application/astroflow-template");
      const tpl = templates?.find((t) => t.key === key);
      if (!tpl) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addTemplateNode(tpl, position);
    },
    [templates, screenToFlowPosition, addTemplateNode]
  );

  return (
    <div className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={beginInteraction}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        fitView
        colorMode="system"
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export function BuilderCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
