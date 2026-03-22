import {
  mockGeneratePipeline,
  mockValidateConnection,
  mockGenerateCode,
  mockTestRun,
  mockLoadTemplate,
  mockInterpretSketch,
} from '../mocks/api';

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
    if (USE_MOCK) {
      return mockGeneratePipeline(intent);
    }
    const response = await fetch(`${API_URL}/api/generate-pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: intent }), // backend expects "description"
    });
    const parsed = await response.json();
    return {
      ...parsed,
      nodes: (parsed.nodes ?? []).map(transformBackendNode),
    };
  },

  validateConnection: async (sourceType: string, targetType: string) => {
    if (USE_MOCK) {
      return mockValidateConnection(sourceType, targetType);
    }
    const response = await fetch(`${API_URL}/api/validate-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType, targetType }),
    });
    return response.json();
  },

  generateCode: async (pipeline: { nodes: any[]; edges: any[] }) => {
    if (USE_MOCK) {
      return mockGenerateCode();
    }
    const response = await fetch(`${API_URL}/api/generate-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: pipeline.nodes.map(toBackendNode), // backend reads node.config
        edges: pipeline.edges,
      }),
    });
    return response.json();
  },

  // Backend streams SSE — caller receives events via onEvent callback.
  testRun: async (
    pipeline: { nodes: any[]; edges: any[] },
    input: string,
    onEvent: (event: RunEvent) => void
  ): Promise<void> => {
    if (USE_MOCK) {
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
    const response = await fetch(`${API_URL}/api/test-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  },

  loadTemplate: async (templateName: string) => {
    if (USE_MOCK) {
      return mockLoadTemplate(templateName);
    }
    const response = await fetch(`${API_URL}/api/template/${templateName}`);
    return response.json();
  },

  interpretSketch: async (
    imageBase64: string,
    feedback?: string
  ): Promise<{ interpretation: string; nodes: any[]; edges: any[] }> => {
    if (USE_MOCK) {
      return mockInterpretSketch(imageBase64, feedback) as Promise<{ interpretation: string; nodes: any[]; edges: any[] }>;
    }
    const response = await fetch(`${API_URL}/api/interpret-sketch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, feedback }),
    });
    const parsed = await response.json();
    return {
      interpretation: parsed.interpretation ?? '',
      nodes: (parsed.nodes ?? []).map(transformBackendNode),
      edges: parsed.edges ?? [],
    };
  },
};
