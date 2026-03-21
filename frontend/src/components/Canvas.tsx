import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
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
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    addNode,
    setSelectedNodeId,
    addCopilotMessage,
  } = usePipelineStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync store with local state
  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

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

      setEdges((eds) => addEdge(newEdge, eds));
      setStoreEdges([...edges, newEdge]);

      addCopilotMessage({
        role: 'claude',
        text: result.message,
      });
    },
    [nodes, edges, setEdges, setStoreEdges, addCopilotMessage]
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

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 75,
        y: event.clientY - reactFlowBounds.top - 40,
      };

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

      addNode(newNode);
      setNodes((nds) => [...nds, newNode]);

      addCopilotMessage({
        role: 'claude',
        text: `${type.toUpperCase()} node added. Click it to configure.`,
      });
    },
    [addNode, setNodes, addCopilotMessage]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  return (
    <div style={{ flex: 1, background: 'var(--bg-canvas)', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
          variant="dots"
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
