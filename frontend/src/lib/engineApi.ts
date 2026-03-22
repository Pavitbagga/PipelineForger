import { fetchWithAuth } from './api';
import type { EngineNode, EngineEdge, PipelineSchema, StepEvent, ExecutionResult } from '../types/engine';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ── Mock execution (when VITE_USE_MOCK=true) ─────────────────────────────────

async function mockPipelineExecution(
  nodes: EngineNode[],
  input: string,
  onStep: (event: StepEvent) => void,
  onComplete: (result: ExecutionResult) => void
): Promise<void> {
  // Build node type map
  const nodeTypeMap = new Map<string, string>();
  nodes.forEach((n) => nodeTypeMap.set(n.id, n.type));

  // Simulate progressive execution
  const steps: StepEvent[] = [];
  let finalOutput = input;

  for (const node of nodes) {
    // Step 1: Running
    const runningStep: StepEvent = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'running',
      input,
    };
    onStep(runningStep);
    steps.push(runningStep);
    await new Promise((r) => setTimeout(r, 600));

    // Step 2: Success with mock output
    let mockOutput = '';
    switch (node.type) {
      case 'input':
        mockOutput = input;
        break;
      case 'llm':
        mockOutput = `[Mock LLM Response] Based on your input "${input}", here's a helpful response. This is simulated output from the ${node.config?.model || 'LLM'} node.`;
        finalOutput = mockOutput;
        break;
      case 'tool':
        mockOutput = `[Mock Tool Result] Tool ${node.config?.toolType || 'unknown'} executed successfully. Sample data returned.`;
        finalOutput = mockOutput;
        break;
      case 'agent':
        mockOutput = `[Mock Agent Result] Agent completed task: ${node.config?.goal || 'task'}. Steps executed: 3/3.`;
        finalOutput = mockOutput;
        break;
      case 'router':
        mockOutput = '[Mock Router] Routed to primary path based on input content.';
        break;
      case 'output':
        mockOutput = finalOutput;
        break;
      default:
        mockOutput = `[Mock Output] Node ${node.id} processed successfully.`;
    }

    const successStep: StepEvent = {
      nodeId: node.id,
      nodeType: node.type,
      status: 'success',
      input,
      output: mockOutput,
      durationMs: Math.floor(Math.random() * 500) + 200,
    };
    onStep(successStep);
    steps.push(successStep);
    await new Promise((r) => setTimeout(r, 400));
  }

  // Final completion
  const result: ExecutionResult = {
    status: 'success',
    finalOutput,
    steps,
    totalDurationMs: steps.reduce((sum, s) => sum + (s.durationMs || 0), 0),
  };
  onComplete(result);
}

// ── SSE stream reader ─────────────────────────────────────────────────────────

async function readSSEStream(
  response: Response,
  onStep: (event: StepEvent) => void,
  onComplete: (result: ExecutionResult) => void,
  onError: (message: string) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    onError('No response body from server');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        if (parsed['type'] === 'complete') {
          onComplete(parsed['result'] as ExecutionResult);
        } else if (parsed['type'] === 'error') {
          onError((parsed['message'] as string) ?? 'Unknown error');
        } else if ('nodeId' in parsed) {
          // It's a StepEvent
          onStep(parsed as unknown as StepEvent);
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function runPipelineFromCanvas(
  nodes: EngineNode[],
  edges: EngineEdge[],
  input: string,
  pipelineName: string,
  onStep: (event: StepEvent) => void,
  onComplete: (result: ExecutionResult) => void,
  onError: (message: string) => void
): Promise<void> {
  // Use mock execution when VITE_USE_MOCK=true
  if (USE_MOCK) {
    try {
      await mockPipelineExecution(nodes, input, onStep, onComplete);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Mock execution failed');
    }
    return;
  }

  const pipeline: PipelineSchema = {
    pipeline_version: '1.0',
    id: 'canvas',
    name: pipelineName,
    created_at: new Date().toISOString(),
    nodes,
    edges,
  };

  const response = await fetchWithAuth(`${API_URL}/api/engine/run`, {
    method: 'POST',
    body: JSON.stringify({ pipeline, input }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = (body['errors'] as string[] | undefined)?.join(', ')
      ?? (body['error'] as string | undefined)
      ?? `HTTP ${response.status}`;
    onError(errMsg);
    return;
  }

  await readSSEStream(response, onStep, onComplete, onError);
}

export async function runSavedPipeline(
  pipelineId: string,
  input: string,
  onStep: (event: StepEvent) => void,
  onComplete: (result: ExecutionResult) => void,
  onError: (message: string) => void
): Promise<void> {
  const response = await fetchWithAuth(`${API_URL}/api/engine/${pipelineId}/run`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const errMsg = (body['errors'] as string[] | undefined)?.join(', ')
      ?? (body['error'] as string | undefined)
      ?? `HTTP ${response.status}`;
    onError(errMsg);
    return;
  }

  await readSSEStream(response, onStep, onComplete, onError);
}

export async function validatePipeline(
  nodes: EngineNode[],
  edges: EngineEdge[]
): Promise<{ valid: boolean; errors: string[] }> {
  const pipeline: PipelineSchema = {
    pipeline_version: '1.0',
    id: 'canvas',
    name: 'Validation check',
    created_at: new Date().toISOString(),
    nodes,
    edges,
  };

  const response = await fetchWithAuth(`${API_URL}/api/engine/validate`, {
    method: 'POST',
    body: JSON.stringify({ pipeline }),
  });

  return response.json() as Promise<{ valid: boolean; errors: string[] }>;
}
