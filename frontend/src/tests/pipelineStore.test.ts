import { describe, it, expect, beforeEach } from 'vitest';
import { usePipelineStore } from '../store/pipelineStore';
import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from '../store/pipelineStore';

describe('Pipeline Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = usePipelineStore.getState();
    store.clearPipeline();
    // Clear copilot messages
    usePipelineStore.setState({ copilotMessages: [] });
  });

  describe('addNode', () => {
    it('should add a node to the store', () => {
      const store = usePipelineStore.getState();
      const newNode: Node<NodeData> = {
        id: 'test-node-1',
        type: 'input',
        position: { x: 100, y: 200 },
        data: { label: 'Test Input', status: 'idle' },
      };

      store.addNode(newNode);

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toHaveLength(1);
      expect(updatedStore.nodes[0]).toEqual(newNode);
    });

    it('should add multiple nodes', () => {
      const store = usePipelineStore.getState();
      const node1: Node<NodeData> = {
        id: 'node-1',
        type: 'input',
        position: { x: 100, y: 200 },
        data: { label: 'Input', status: 'idle' },
      };
      const node2: Node<NodeData> = {
        id: 'node-2',
        type: 'llm',
        position: { x: 350, y: 200 },
        data: { label: 'LLM', status: 'idle', model: 'claude-sonnet' },
      };

      store.addNode(node1);
      store.addNode(node2);

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toHaveLength(2);
    });
  });

  describe('removeNode', () => {
    it('should remove a node from the store', () => {
      const store = usePipelineStore.getState();
      const node: Node<NodeData> = {
        id: 'node-to-remove',
        type: 'input',
        position: { x: 100, y: 200 },
        data: { label: 'Test', status: 'idle' },
      };

      store.addNode(node);
      expect(usePipelineStore.getState().nodes).toHaveLength(1);

      store.removeNode('node-to-remove');
      expect(usePipelineStore.getState().nodes).toHaveLength(0);
    });

    it('should remove connected edges when removing a node', () => {
      const store = usePipelineStore.getState();

      // Add nodes
      const node1: Node<NodeData> = {
        id: 'node-1',
        type: 'input',
        position: { x: 100, y: 200 },
        data: { label: 'Input', status: 'idle' },
      };
      const node2: Node<NodeData> = {
        id: 'node-2',
        type: 'output',
        position: { x: 350, y: 200 },
        data: { label: 'Output', status: 'idle' },
      };

      store.addNode(node1);
      store.addNode(node2);

      // Add edge connecting the nodes
      const edges: Edge[] = [
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ];
      store.setEdges(edges);

      expect(usePipelineStore.getState().edges).toHaveLength(1);

      // Remove node-1, should also remove the edge
      store.removeNode('node-1');

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toHaveLength(1);
      expect(updatedStore.edges).toHaveLength(0);
    });
  });

  describe('setNodes', () => {
    it('should replace all nodes', () => {
      const store = usePipelineStore.getState();

      // Add initial node
      store.addNode({
        id: 'old-node',
        type: 'input',
        position: { x: 0, y: 0 },
        data: { label: 'Old', status: 'idle' },
      });

      // Replace with new nodes
      const newNodes: Node<NodeData>[] = [
        {
          id: 'new-node-1',
          type: 'input',
          position: { x: 100, y: 200 },
          data: { label: 'New 1', status: 'idle' },
        },
        {
          id: 'new-node-2',
          type: 'output',
          position: { x: 350, y: 200 },
          data: { label: 'New 2', status: 'idle' },
        },
      ];

      store.setNodes(newNodes);

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toHaveLength(2);
      expect(updatedStore.nodes[0].id).toBe('new-node-1');
      expect(updatedStore.nodes[1].id).toBe('new-node-2');
    });
  });

  describe('loadTemplate', () => {
    it('should set nodes, edges, and add copilot message', () => {
      const store = usePipelineStore.getState();

      const nodes: Node<NodeData>[] = [
        {
          id: 'template-node-1',
          type: 'input',
          position: { x: 100, y: 200 },
          data: { label: 'Template Input', status: 'idle' },
        },
      ];

      const edges: Edge[] = [];

      const message = 'Template loaded successfully!';

      store.loadTemplate(nodes, edges, message);

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toHaveLength(1);
      expect(updatedStore.nodes[0].id).toBe('template-node-1');
      expect(updatedStore.edges).toEqual(edges);

      // Check if copilot message was added
      const lastMessage = updatedStore.copilotMessages[updatedStore.copilotMessages.length - 1];
      expect(lastMessage.role).toBe('claude');
      expect(lastMessage.text).toBe(message);
    });
  });

  describe('clearPipeline', () => {
    it('should reset nodes, edges, and selectedNodeId', () => {
      const store = usePipelineStore.getState();

      // Add some data
      store.addNode({
        id: 'node-1',
        type: 'input',
        position: { x: 100, y: 200 },
        data: { label: 'Test', status: 'idle' },
      });

      store.setEdges([
        { id: 'edge-1', source: 'node-1', target: 'node-2' },
      ]);

      store.setSelectedNodeId('node-1');

      // Clear everything
      store.clearPipeline();

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.nodes).toEqual([]);
      expect(updatedStore.edges).toEqual([]);
      expect(updatedStore.selectedNodeId).toBeNull();
    });
  });

  describe('updateNode', () => {
    it('should update node data', () => {
      const store = usePipelineStore.getState();

      const node: Node<NodeData> = {
        id: 'node-1',
        type: 'llm',
        position: { x: 100, y: 200 },
        data: {
          label: 'LLM Node',
          status: 'idle',
          model: 'claude-sonnet',
          temperature: 0.7,
        },
      };

      store.addNode(node);

      // Update the node
      store.updateNode('node-1', {
        temperature: 0.9,
        systemPrompt: 'You are a helpful assistant',
      });

      const updatedStore = usePipelineStore.getState();
      const updatedNode = updatedStore.nodes[0];
      expect(updatedNode.data.temperature).toBe(0.9);
      expect(updatedNode.data.systemPrompt).toBe('You are a helpful assistant');
      expect(updatedNode.data.model).toBe('claude-sonnet'); // Should keep other fields
    });
  });

  describe('addCopilotMessage', () => {
    it('should add a message to copilot messages', () => {
      const store = usePipelineStore.getState();

      const initialCount = store.copilotMessages.length;

      store.addCopilotMessage({
        role: 'claude',
        text: 'Test message',
      });

      const updatedStore = usePipelineStore.getState();
      expect(updatedStore.copilotMessages).toHaveLength(initialCount + 1);

      const lastMessage = updatedStore.copilotMessages[updatedStore.copilotMessages.length - 1];
      expect(lastMessage.role).toBe('claude');
      expect(lastMessage.text).toBe('Test message');
    });
  });
});
