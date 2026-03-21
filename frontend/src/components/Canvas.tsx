import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipelineStore } from '../store/pipelineStore';
import type { NodeData } from '../store/pipelineStore';
import { apiClient } from '../lib/apiClient';
import InputNode from './nodes/InputNode';
import LLMNode from './nodes/LLMNode';
import ToolNode from './nodes/ToolNode';
import AgentNode from './nodes/AgentNode';
import RouterNode from './nodes/RouterNode';
import OutputNode from './nodes/OutputNode';

const nodeTypes = {
  input: InputNode,
  llm: LLMNode,
  tool: ToolNode,
  agent: AgentNode,
  router: RouterNode,
  output: OutputNode,
};

export const Canvas = () => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setEdges: setStoreEdges,
    addNode,
    setSelectedNodeId,
    addCopilotMessage,
  } = usePipelineStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync store TO local state (when store changes from outside)
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // Wrap onNodesChange to sync back TO store (BUG FIX #2)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      // After React Flow processes the changes, sync back to store
      setNodes((currentNodes) => {
        setStoreNodes(currentNodes);
        return currentNodes;
      });
    },
    [onNodesChange, setNodes, setStoreNodes]
  );

  // Wrap onEdgesChange to sync back TO store (BUG FIX #2)
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      // After React Flow processes the changes, sync back to store
      setEdges((currentEdges) => {
        setStoreEdges(currentEdges);
        return currentEdges;
      });
    },
    [onEdgesChange, setEdges, setStoreEdges]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) return;

      // Validate connection
      const result: any = await apiClient.validateConnection(
        sourceNode.type || '',
        targetNode.type || ''
      );

      if (!result.compatible) {
        addCopilotMessage({
          role: 'system',
          text: result.message,
        });
        return;
      }

      const newEdge = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
      } as Edge;

      setEdges((eds) => {
        const updatedEdges = addEdge(newEdge, eds);
        setStoreEdges(updatedEdges);
        return updatedEdges;
      });

      addCopilotMessage({
        role: 'claude',
        text: result.message,
      });
    },
    [nodes, setEdges, setStoreEdges, addCopilotMessage]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // BUG FIX #1: Use screenToFlowPosition for accurate positioning
      // This accounts for zoom and pan transforms
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<NodeData> = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1),
          status: 'idle',
          ...(type === 'llm' && {
            model: 'claude-sonnet',
            systemPrompt: '',
            temperature: 0.7,
          }),
          ...(type === 'tool' && {
            toolType: 'search',
            parameters: {},
          }),
          ...(type === 'agent' && {
            goal: '',
            maxSteps: 5,
            availableTools: [],
          }),
          ...(type === 'router' && {
            condition: '',
          }),
        },
      };

      // Update both React Flow state and Zustand store
      setNodes((nds) => {
        const updatedNodes = [...nds, newNode];
        setStoreNodes(updatedNodes);
        return updatedNodes;
      });
      addNode(newNode);

      addCopilotMessage({
        role: 'claude',
        text: `${type.toUpperCase()} node added. Click it to configure.`,
      });
    },
    [screenToFlowPosition, setNodes, setStoreNodes, addNode, addCopilotMessage]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{ flex: 1, background: 'var(--bg-canvas)', position: 'relative' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        style={{
          background: 'var(--bg-canvas)',
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255, 255, 255, 0.1)"
        />
        <Controls
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
        />
        <MiniMap
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
          }}
          nodeColor={(node) => {
            const colorMap: Record<string, string> = {
              input: '#10b981',
              llm: '#6366f1',
              tool: '#f59e0b',
              agent: '#8b5cf6',
              router: '#22d3ee',
              output: '#f43f5e',
            };
            return colorMap[node.type || 'default'] || '#6b6b8a';
          }}
        />
      </ReactFlow>
    </div>
  );
};
