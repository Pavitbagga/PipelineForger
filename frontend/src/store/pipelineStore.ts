import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import { fetchWithAuth } from '../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type SavedPipeline = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
};

export type NodeStatus = 'idle' | 'running' | 'done' | 'error';

export type NodeData = {
  label: string;
  // For LLM nodes:
  model?: 'claude-sonnet' | 'gpt-4' | 'gemini-pro';
  systemPrompt?: string;
  temperature?: number;
  // For Tool nodes:
  toolType?: 'search' | 'code' | 'file' | 'api';
  parameters?: Record<string, string>;
  // For Agent nodes:
  goal?: string;
  maxSteps?: number;
  availableTools?: string[];
  // For Router nodes:
  condition?: string;
  // Status for all nodes:
  status?: NodeStatus;
};

export type CopilotMessage = {
  role: 'claude' | 'system';
  text: string;
};

type PipelineStore = {
  nodes: Node<NodeData>[];
  edges: Edge[];
  copilotMessages: CopilotMessage[];
  selectedNodeId: string | null;
  isRunning: boolean;
  isGeneratingCode: boolean;
  currentPipelineId: string | null;
  savedPipelines: SavedPipeline[];

  // Actions
  addNode: (node: Node<NodeData>) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addCopilotMessage: (message: CopilotMessage) => void;
  setSelectedNodeId: (id: string | null) => void;
  setIsRunning: (isRunning: boolean) => void;
  setIsGeneratingCode: (isGenerating: boolean) => void;
  loadTemplate: (nodes: Node<NodeData>[], edges: Edge[], message: string) => void;
  clearPipeline: () => void;
  savePipeline: (name: string) => Promise<void>;
  loadPipelines: () => Promise<SavedPipeline[]>;
};

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  nodes: [],
  edges: [],
  copilotMessages: [
    {
      role: 'claude',
      text: 'Drop a node to get started, or describe your pipeline above.',
    },
  ],
  selectedNodeId: null,
  isRunning: false,
  isGeneratingCode: false,
  currentPipelineId: null,
  savedPipelines: [],

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (id, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    })),

  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
    })),

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addCopilotMessage: (message) =>
    set((state) => ({
      copilotMessages: [...state.copilotMessages, message],
    })),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setIsRunning: (isRunning) => set({ isRunning }),

  setIsGeneratingCode: (isGenerating) => set({ isGeneratingCode: isGenerating }),

  loadTemplate: (nodes, edges, message) =>
    set((state) => ({
      nodes,
      edges,
      copilotMessages: [...state.copilotMessages, { role: 'claude', text: message }],
    })),

  clearPipeline: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      currentPipelineId: null,
    }),

  savePipeline: async (name: string) => {
    const { nodes, edges } = get();
    try {
      const response = await fetchWithAuth(`${API_URL}/api/pipelines`, {
        method: 'POST',
        body: JSON.stringify({ name, nodes, edges }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const saved = (await response.json()) as SavedPipeline;
      set({ currentPipelineId: saved.id });
    } catch (err) {
      console.error('[store] savePipeline failed:', err);
      throw err;
    }
  },

  loadPipelines: async () => {
    try {
      const response = await fetchWithAuth(`${API_URL}/api/pipelines`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const pipelines = (await response.json()) as SavedPipeline[];
      set({ savedPipelines: pipelines });
      return pipelines;
    } catch (err) {
      console.error('[store] loadPipelines failed:', err);
      throw err;
    }
  },
}));
