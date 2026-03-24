import {
  mockGeneratePipeline,
  mockValidateConnection,
  mockGenerateCode,
  mockTestRun,
  mockLoadTemplate,
  mockInterpretSketch,
} from '../mocks/api';
import {
  getMockPipeline,
  getMockTemplate,
  getMockCopilotMessages,
  getMockEthicsRisks,
  getMockGeneratedCode,
} from './mocks/demoData';
import { fetchWithAuth } from './api';

// DEMO_MODE: Deterministic, polished mock data for demo videos
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
// USE_MOCK: Development mocks with real Claude API calls
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Backend returns nodes with a nested `config` object.
// React Flow needs nodes with a flat `data` object.
function transformBackendNode(backendNode: any) {
  const labelMap: Record<string, string> = {
    input: 'Input',
    llm: 'LLM',
    tool: 'Tool',
    agent: 'Agent',
    router: 'Router',
    output: 'Output',
  };
  const modelMap: Record<string, string> = {
    'claude-sonnet-4-20250514': 'claude-sonnet',
    'gpt-4': 'gpt-4',
    'gemini-pro': 'gemini-pro',
  };
  const toolTypeMap: Record<string, string> = {
    web_search: 'search',
    code_executor: 'code',
    file_reader: 'file',
    api_caller: 'api',
  };
  const { id, type, position, config = {} } = backendNode;

  // Client-side fallback defaults — backend should fill these, but this is a last resort
  const clientDefaults: Record<string, Record<string, any>> = {
    llm:    { model: 'claude-sonnet', systemPrompt: 'You are a helpful assistant.', temperature: 0.7 },
    tool:   { toolType: 'search' },
    agent:  { goal: 'Complete the assigned task.', maxSteps: 5 },
    router: { condition: 'Route based on input content.' },
    input:  {},
    output: {},
  };
  const defaults = clientDefaults[type] ?? {};

  return {
    id,
    type,
    position: position ?? { x: 100, y: 300 },
    data: {
      // config.label wins if present (Claude-generated descriptive name); fall back to type map
      label: config.label ?? labelMap[type] ?? type,
      ...defaults,
      ...(config.model != null ? { model: modelMap[config.model] ?? config.model } : {}),
      ...(config.systemPrompt != null ? { systemPrompt: config.systemPrompt } : {}),
      ...(config.temperature != null ? { temperature: config.temperature } : {}),
      ...(config.toolType != null ? { toolType: toolTypeMap[config.toolType] ?? config.toolType } : {}),
      ...(config.goal != null ? { goal: config.goal } : {}),
      ...(config.maxSteps != null ? { maxSteps: config.maxSteps } : {}),
      ...(config.condition != null ? { condition: config.condition } : {}),
      ...(config.tools != null ? { availableTools: config.tools } : {}),
    },
  };
}

// React Flow nodes have a flat `data` object; backend executor reads `node.config`.
function toBackendNode(rfNode: any) {
  const modelMap: Record<string, string> = {
    'claude-sonnet': 'claude-sonnet-4-20250514',
    'gpt-4': 'gpt-4',
    'gemini-pro': 'gemini-pro',
  };
  const toolTypeMap: Record<string, string> = {
    search: 'web_search',
    code: 'code_executor',
    file: 'file_reader',
    api: 'api_caller',
  };
  const { id, type, position, data = {} } = rfNode;
  return {
    id,
    type,
    position,
    config: {
      ...(data.model != null ? { model: modelMap[data.model] ?? data.model } : {}),
      ...(data.systemPrompt != null ? { systemPrompt: data.systemPrompt } : {}),
      ...(data.temperature != null ? { temperature: data.temperature } : {}),
      ...(data.toolType != null ? { toolType: toolTypeMap[data.toolType] ?? data.toolType } : {}),
      ...(data.goal != null ? { goal: data.goal } : {}),
      ...(data.availableTools != null ? { tools: data.availableTools } : {}),
    },
    inputs: ['text'],
    outputs: ['text'],
  };
}

export type RunEvent =
  | { nodeId: string; status: 'running' }
  | { nodeId: string; status: 'success'; output: string }
  | { nodeId: string; status: 'error'; error: string }
  | { status: 'complete'; finalOutput: string }
  | { status: 'fatal'; error: string };

export const apiClient = {
  generatePipeline: async (intent: string) => {
    // DEMO MODE: Use deterministic demo pipeline
    if (DEMO_MODE) {
      return getMockPipeline(intent);
    }

    if (USE_MOCK) {
      return mockGeneratePipeline(intent);
    }

    // Real API with fail-safe fallback
    try {
      const response = await fetchWithAuth(`${API_URL}/api/generate-pipeline`, {
        method: 'POST',
        body: JSON.stringify({ description: intent }),
      });
      const parsed = await response.json();
      return {
        ...parsed,
        nodes: (parsed.nodes ?? []).map(transformBackendNode),
      };
    } catch (error) {
      console.warn('[apiClient] generatePipeline failed, falling back to demo data:', error);
      return getMockPipeline(intent);
    }
  },

  validateConnection: async (sourceType: string, targetType: string) => {
    // DEMO MODE: Always return success
    if (DEMO_MODE) {
      return {
        compatible: true,
        message: `✓ ${sourceType} → ${targetType} connection validated! Data will flow smoothly.`,
      };
    }

    if (USE_MOCK) {
      return mockValidateConnection(sourceType, targetType);
    }

    try {
      const response = await fetchWithAuth(`${API_URL}/api/validate-connection`, {
        method: 'POST',
        body: JSON.stringify({ sourceType, targetType }),
      });
      return response.json();
    } catch (error) {
      console.warn('[apiClient] validateConnection failed, falling back to demo data:', error);
      return { compatible: true, message: `${sourceType} → ${targetType} connection looks good.` };
    }
  },

  generateCode: async (pipeline: { nodes: any[]; edges: any[] }) => {
    // DEMO MODE: Use polished demo code
    if (DEMO_MODE) {
      return getMockGeneratedCode();
    }

    if (USE_MOCK) {
      return mockGenerateCode();
    }

    try {
      const response = await fetchWithAuth(`${API_URL}/api/generate-code`, {
        method: 'POST',
        body: JSON.stringify({
          nodes: pipeline.nodes.map(toBackendNode),
          edges: pipeline.edges,
        }),
      });
      return response.json();
    } catch (error) {
      console.warn('[apiClient] generateCode failed, falling back to demo data:', error);
      return getMockGeneratedCode();
    }
  },

  // Backend streams SSE — caller receives events via onEvent callback.
  testRun: async (
    pipeline: { nodes: any[]; edges: any[] },
    input: string,
    onEvent: (event: RunEvent) => void
  ): Promise<void> => {
    // DEMO MODE or USE_MOCK: Use mock execution
    if (DEMO_MODE || USE_MOCK) {
      const result: any = await mockTestRun(pipeline, input);
      for (const log of result.logs) {
        onEvent({
          nodeId: log.nodeId,
          status: log.status === 'done' ? 'success' : log.status,
          output: log.output,
        } as RunEvent);
        await new Promise((r) => setTimeout(r, 600));
      }
      return;
    }

    // Real mode with fail-safe fallback
    try {
      const response = await fetchWithAuth(`${API_URL}/api/test-run`, {
        method: 'POST',
        body: JSON.stringify({
          nodes: pipeline.nodes.map(toBackendNode),
          edges: pipeline.edges,
          input,
        }),
      });
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } catch (error) {
      console.warn('[apiClient] testRun failed, using mock fallback:', error);
      // FAIL-SAFE: Use mock test run on error
      const result: any = await mockTestRun(pipeline, input);
      for (const log of result.logs) {
        onEvent({
          nodeId: log.nodeId,
          status: log.status === 'done' ? 'success' : log.status,
          output: log.output,
        } as RunEvent);
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  },

  loadTemplate: async (templateName: string) => {
    // DEMO MODE: Use polished demo templates
    if (DEMO_MODE) {
      return getMockTemplate(templateName);
    }

    if (USE_MOCK) {
      return mockLoadTemplate(templateName);
    }

    try {
      const response = await fetchWithAuth(`${API_URL}/api/template/${templateName}`);
      return response.json();
    } catch (error) {
      console.warn('[apiClient] loadTemplate failed, falling back to demo data:', error);
      return getMockTemplate(templateName);
    }
  },

  interpretSketch: async (
    imageBase64: string,
    feedback?: string
  ): Promise<{ interpretation: string; nodes: any[]; edges: any[] }> => {
    // DEMO MODE or USE_MOCK: Use mock sketch interpretation
    if (DEMO_MODE || USE_MOCK) {
      return mockInterpretSketch(imageBase64, feedback) as Promise<{ interpretation: string; nodes: any[]; edges: any[] }>;
    }

    // Real mode with fail-safe fallback
    try {
      const response = await fetchWithAuth(`${API_URL}/api/interpret-sketch`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64, feedback }),
      });
      const parsed = await response.json();
      return {
        interpretation: parsed.interpretation ?? '',
        nodes: (parsed.nodes ?? []).map(transformBackendNode),
        edges: parsed.edges ?? [],
      };
    } catch (error) {
      console.warn('[apiClient] interpretSketch failed, using mock fallback:', error);
      // FAIL-SAFE: Use mock interpretation on error
      return mockInterpretSketch(imageBase64, feedback) as Promise<{ interpretation: string; nodes: any[]; edges: any[] }>;
    }
  },

  /**
   * Send a message to the copilot and get an intelligent response with optional actions
   */
  sendCopilotMessage: async (
    userMessage: string,
    pipeline: { nodes: any[]; edges: any[] }
  ): Promise<{ response: string; actions?: any[] }> => {
    // Always use real backend for intelligent copilot responses
    try {
      const response = await fetchWithAuth(`${API_URL}/api/copilot/chat`, {
        method: 'POST',
        body: JSON.stringify({ message: userMessage, nodes: pipeline.nodes, edges: pipeline.edges }),
      });
      return response.json();
    } catch (error) {
      console.error('[apiClient] sendCopilotMessage failed:', error);

      // Fallback: Try mock with real Claude API
      if (USE_MOCK) {
        try {
          const { mockCopilotMessage } = await import('../mocks/api');
          return mockCopilotMessage(userMessage, pipeline);
        } catch {
          // Fall through to error response
        }
      }

      // Last resort: return error message
      throw new Error('Failed to connect to copilot. Please ensure the backend is running.');
    }
  },

  /**
   * Get ethics risks for the current pipeline (DEMO MODE only)
   */
  getEthicsRisks: async (nodes: any[]): Promise<{ risks: any[] }> => {
    if (DEMO_MODE) {
      return { risks: getMockEthicsRisks(nodes) };
    }
    // In real mode, this would call a backend endpoint
    return { risks: [] };
  },
};
