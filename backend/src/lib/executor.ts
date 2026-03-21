import { askClaude } from './claude';

export interface PipelineNode {
  id: string;
  type: 'input' | 'llm' | 'tool' | 'agent' | 'router' | 'output';
  position: { x: number; y: number };
  config: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    toolType?: string;
    goal?: string;
    tools?: string[];
  };
  inputs: string[];
  outputs: string[];
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

/**
 * Topological sort via Kahn's algorithm.
 * Throws if a cycle is detected.
 */
export function topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): PipelineNode[] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  }
  for (const edge of edges) {
    adjList[edge.source].push(edge.target);
    inDegree[edge.target]++;
  }

  const queue = nodes.filter(n => inDegree[n.id] === 0);
  const sorted: PipelineNode[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighborId of adjList[node.id]) {
      inDegree[neighborId]--;
      if (inDegree[neighborId] === 0) {
        queue.push(nodes.find(n => n.id === neighborId)!);
      }
    }
  }

  if (sorted.length !== nodes.length) {
    throw new Error('Cycle detected in pipeline graph');
  }

  return sorted;
}

/** Execute a single node given its input and resolved config. */
export async function executeNode(node: PipelineNode, input: string): Promise<string> {
  switch (node.type) {
    case 'input':
      return input;

    case 'llm':
      return await askClaude(
        node.config.systemPrompt || 'You are a helpful assistant.',
        input
      );

    case 'tool': {
      const toolType = node.config.toolType;
      if (toolType === 'web_search') {
        return `[Search results for: ${input}] (stub — wire up SerpAPI here)`;
      }
      if (toolType === 'code_executor') {
        return `[Code execution result for: ${input}] (stub)`;
      }
      if (toolType === 'file_reader') {
        return `[File content for: ${input}] (stub)`;
      }
      if (toolType === 'api_caller') {
        return `[API response for: ${input}] (stub)`;
      }
      return `[Tool "${toolType}" result for: ${input}]`;
    }

    case 'agent':
      return await askClaude(
        `You are an autonomous agent. Goal: ${node.config.goal || 'complete the task'}.
Available tools: ${(node.config.tools || []).join(', ')}.
Reason step by step and provide your final answer.`,
        input
      );

    case 'router':
      return input;

    case 'output':
      return input;

    default:
      return input;
  }
}
