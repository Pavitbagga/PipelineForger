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
// ADD THIS: shared default config utility
import { getDefaultConfig } from '../lib/nodeDefaults';
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

export const Canvas = ({ theme }: { theme?: 'dark' | 'light' }) => {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
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

  // Sync React Flow nodes → Zustand store
  useEffect(() => {
    setStoreNodes(nodes);
  }, [nodes, setStoreNodes]);

  // Sync React Flow edges → Zustand store
  useEffect(() => {
    setStoreEdges(edges);
  }, [edges, setStoreEdges]);

  // Wrap onNodesChange - store sync happens in useEffect
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  // Wrap onEdgesChange - store sync happens in useEffect
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
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
        return addEdge(newEdge, eds);
      });

      addCopilotMessage({
        role: 'claude',
        text: result.message,
      });
    },
    [nodes, setEdges, addCopilotMessage]
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
      // FAIL-SAFE: If coordinate conversion fails, use fallback position
      let position;
      try {
        position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // Validate position is valid
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' ||
            !isFinite(position.x) || !isFinite(position.y)) {
          throw new Error('Invalid position calculated');
        }
      } catch (error) {
        console.warn('[Canvas] screenToFlowPosition failed, using fallback position:', error);
        // Fallback: Place node in center-ish area with slight randomness
        position = {
          x: 300 + Math.random() * 200,
          y: 250 + Math.random() * 100,
        };
      }

      // FAIL-SAFE: Ensure node creation always succeeds
      try {
        const newNode: Node<NodeData> = {
          id: `node_${Date.now()}`,
          type,
          position,
          data: {
            label: type.charAt(0).toUpperCase() + type.slice(1),
            status: 'idle',
            // Flat fields for node renderers and ConfigPanel (frontend names)
            ...(type === 'input' && {
              inputType: 'text',
              placeholder: 'Enter your input...',
            }),
            ...(type === 'llm' && {
              model: 'claude-sonnet' as const,
              systemPrompt: 'You are a helpful assistant. Complete the task provided.',
              temperature: 0.7,
            }),
            ...(type === 'tool' && {
              toolType: 'search' as const,
              parameters: {},
            }),
            ...(type === 'agent' && {
              goal: 'Complete the task provided by the user.',
              maxSteps: 3,
              availableTools: [],
            }),
            ...(type === 'router' && {
              condition: '',
            }),
            // ADD THIS: nested backend-ready config — single source of truth for
            // serialisation. Never undefined after creation.
            config: getDefaultConfig(type),
          },
          style: {
            animation: 'fade-in-scale 0.4s ease-out',
          },
        };

        // Update React Flow state (Zustand sync happens in useEffect)
        setNodes((nds) => {
          return [...nds, newNode];
        });
        addNode(newNode);

        addCopilotMessage({
          role: 'claude',
          text: `${type.toUpperCase()} node added. Click it to configure.`,
        });
      } catch (error) {
        console.error('[Canvas] Node creation failed:', error);
        // Last resort: create minimal node that will at least render
        const minimalNode: Node<NodeData> = {
          id: `node_${Date.now()}`,
          type: type as any,
          position,
          data: {
            label: type.charAt(0).toUpperCase() + type.slice(1),
            status: 'idle',
          },
        };
        setNodes((nds) => [...nds, minimalNode]);
        addCopilotMessage({
          role: 'system',
          text: `${type.toUpperCase()} node added (minimal config). Please configure it manually.`,
        });
      }
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
      data-tour="canvas-area"
      ref={reactFlowWrapper}
      style={{
        flex: 1,
        background: theme === 'dark'
          ? 'radial-gradient(ellipse at center, #1a1a3e20 0%, transparent 70%), radial-gradient(ellipse at center, #13131f 0%, var(--bg-canvas) 50%, #0a0a0f 100%)'
          : 'radial-gradient(ellipse at center, rgba(79, 70, 229, 0.08) 0%, transparent 70%), radial-gradient(ellipse at center, #d8def5 0%, var(--bg-canvas) 50%, #b8bfe8 100%)',
        position: 'relative',
      }}
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
          background: 'transparent',
        }}
      >
        {/* Animated dot grid */}
        <Background
          id="dots"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme === 'light' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.08)'}
          style={{
            opacity: 1,
          }}
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
