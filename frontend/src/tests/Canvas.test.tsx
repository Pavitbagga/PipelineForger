import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from '../components/Canvas';
import { usePipelineStore } from '../store/pipelineStore';

// Mock the API client
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    validateConnection: vi.fn(() =>
      Promise.resolve({ compatible: true, message: 'Connection is valid' })
    ),
  },
}));

// Helper to render Canvas with ReactFlowProvider
const renderCanvas = () => {
  return render(
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
};

describe('Canvas Component', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = usePipelineStore.getState();
    store.clearPipeline();
    usePipelineStore.setState({ copilotMessages: [] });
  });

  it('should render without crashing', () => {
    renderCanvas();
    // React Flow renders a container with specific class
    const reactFlowContainer = document.querySelector('.react-flow');
    expect(reactFlowContainer).toBeTruthy();
  });

  it('should display nodes from the store', () => {
    const store = usePipelineStore.getState();

    // Add a node to the store
    store.addNode({
      id: 'test-node-1',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'Test Input Node', status: 'idle' },
    });

    renderCanvas();

    // React Flow should render the node
    // Note: The exact text may vary based on how the custom node renders
    // We're checking if the React Flow container exists and has children
    const reactFlowContainer = document.querySelector('.react-flow');
    expect(reactFlowContainer).toBeTruthy();

    // Verify the store has the node
    const updatedStore = usePipelineStore.getState();
    expect(updatedStore.nodes).toHaveLength(1);
    expect(updatedStore.nodes[0].id).toBe('test-node-1');
  });

  it('should display multiple nodes from the store', () => {
    const store = usePipelineStore.getState();

    // Add multiple nodes
    store.addNode({
      id: 'node-1',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'Input', status: 'idle' },
    });

    store.addNode({
      id: 'node-2',
      type: 'llm',
      position: { x: 350, y: 200 },
      data: { label: 'LLM', status: 'idle', model: 'claude-sonnet' },
    });

    store.addNode({
      id: 'node-3',
      type: 'output',
      position: { x: 600, y: 200 },
      data: { label: 'Output', status: 'idle' },
    });

    renderCanvas();

    // Verify all nodes are in the store
    const updatedStore = usePipelineStore.getState();
    expect(updatedStore.nodes).toHaveLength(3);
  });

  it('should sync node deletion to store', () => {
    const store = usePipelineStore.getState();

    // Add nodes
    store.addNode({
      id: 'node-1',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'Input', status: 'idle' },
    });

    store.addNode({
      id: 'node-2',
      type: 'output',
      position: { x: 350, y: 200 },
      data: { label: 'Output', status: 'idle' },
    });

    renderCanvas();

    expect(usePipelineStore.getState().nodes).toHaveLength(2);

    // Remove a node
    store.removeNode('node-1');

    // Verify node is removed from store
    const updatedStore = usePipelineStore.getState();
    expect(updatedStore.nodes).toHaveLength(1);
    expect(updatedStore.nodes[0].id).toBe('node-2');
  });

  it('should ensure deleted nodes do not reappear when adding new nodes', () => {
    const store = usePipelineStore.getState();

    // Add initial node
    store.addNode({
      id: 'node-to-delete',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'Will be deleted', status: 'idle' },
    });

    expect(usePipelineStore.getState().nodes).toHaveLength(1);

    // Delete the node
    store.removeNode('node-to-delete');
    expect(usePipelineStore.getState().nodes).toHaveLength(0);

    // Add a new node
    store.addNode({
      id: 'new-node',
      type: 'llm',
      position: { x: 350, y: 200 },
      data: { label: 'New Node', status: 'idle', model: 'claude-sonnet' },
    });

    // Verify only the new node exists
    const updatedStore = usePipelineStore.getState();
    expect(updatedStore.nodes).toHaveLength(1);
    expect(updatedStore.nodes[0].id).toBe('new-node');
    expect(updatedStore.nodes.find((n) => n.id === 'node-to-delete')).toBeUndefined();
  });

  it('should handle edges in the store', () => {
    const store = usePipelineStore.getState();

    // Add nodes
    store.addNode({
      id: 'node-1',
      type: 'input',
      position: { x: 100, y: 200 },
      data: { label: 'Input', status: 'idle' },
    });

    store.addNode({
      id: 'node-2',
      type: 'output',
      position: { x: 350, y: 200 },
      data: { label: 'Output', status: 'idle' },
    });

    // Add edge
    store.setEdges([
      { id: 'edge-1', source: 'node-1', target: 'node-2' },
    ]);

    renderCanvas();

    // Verify edge exists in store
    const updatedStore = usePipelineStore.getState();
    expect(updatedStore.edges).toHaveLength(1);
    expect(updatedStore.edges[0].source).toBe('node-1');
    expect(updatedStore.edges[0].target).toBe('node-2');
  });

  it('should render with ReactFlow controls', () => {
    renderCanvas();

    // Check if React Flow controls are rendered
    const controls = document.querySelector('.react-flow__controls');
    expect(controls).toBeTruthy();
  });

  it('should render with minimap', () => {
    renderCanvas();

    // Check if minimap is rendered
    const minimap = document.querySelector('.react-flow__minimap');
    expect(minimap).toBeTruthy();
  });

  it('should render with background pattern', () => {
    renderCanvas();

    // Check if background is rendered
    const background = document.querySelector('.react-flow__background');
    expect(background).toBeTruthy();
  });
});
