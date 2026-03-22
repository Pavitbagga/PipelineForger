/**
 * Single source of truth for default node configs.
 *
 * getDefaultConfig   — returns a backend-ready config object (uses backend model IDs,
 *                       backend toolType strings, etc.)
 * buildConfigFromData — converts flat NodeData fields (frontend names) into a
 *                       backend-ready config object so ConfigPanel saves always
 *                       keep data.config in sync with the flat fields.
 */

import type { NodeData } from '../store/pipelineStore';

// ── Frontend → backend name maps (same as apiClient.ts toBackendNode) ─────────

const MODEL_TO_BACKEND: Record<string, string> = {
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'gpt-4': 'gpt-4',
  'gemini-pro': 'gemini-pro',
};

const TOOL_TYPE_TO_BACKEND: Record<string, string> = {
  search: 'web_search',
  code: 'code_executor',
  file: 'file_reader',
  api: 'api_caller',
};

// ── Default configs ────────────────────────────────────────────────────────────

export function getDefaultConfig(nodeType: string): Record<string, unknown> {
  switch (nodeType) {
    case 'input':
      return {
        inputType: 'text',
        label: 'Input',
        placeholder: 'Enter your input here...',
      };
    case 'llm':
      return {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are a helpful assistant. Complete the task provided.',
        temperature: 0.7,
        maxTokens: 1000,
      };
    case 'tool':
      return {
        toolType: 'web_search',
        parameters: {},
      };
    case 'agent':
      return {
        goal: 'Complete the task provided by the user.',
        tools: ['web_search'],
        maxSteps: 3,
        model: 'claude-sonnet-4-20250514',
      };
    case 'router':
      return {
        conditions: [],
        defaultTarget: '',
      };
    case 'output':
      return {
        outputType: 'text',
        label: 'Output',
      };
    default:
      return {};
  }
}

// Pre-built map for places that need all configs at once.
export const NODE_DEFAULT_CONFIGS = {
  input:  getDefaultConfig('input'),
  llm:    getDefaultConfig('llm'),
  tool:   getDefaultConfig('tool'),
  agent:  getDefaultConfig('agent'),
  router: getDefaultConfig('router'),
  output: getDefaultConfig('output'),
} as const;

// ── Config builder (flat NodeData → backend config) ────────────────────────────
// Used by ConfigPanel so that data.config stays in sync after every save.

export function buildConfigFromData(
  nodeType: string,
  data: NodeData
): Record<string, unknown> {
  const defaults = getDefaultConfig(nodeType);

  switch (nodeType) {
    case 'llm':
      return {
        model: MODEL_TO_BACKEND[data.model ?? ''] ?? defaults['model'],
        systemPrompt: data.systemPrompt ?? (defaults['systemPrompt'] as string),
        temperature: data.temperature ?? (defaults['temperature'] as number),
        maxTokens: (data as Record<string, unknown>)['maxTokens'] as number | undefined
          ?? (defaults['maxTokens'] as number),
      };
    case 'tool':
      return {
        toolType: TOOL_TYPE_TO_BACKEND[data.toolType ?? ''] ?? defaults['toolType'],
        parameters: data.parameters ?? {},
      };
    case 'agent':
      return {
        goal: data.goal ?? (defaults['goal'] as string),
        tools: data.availableTools ?? (defaults['tools'] as string[]),
        maxSteps: data.maxSteps ?? (defaults['maxSteps'] as number),
        model: 'claude-sonnet-4-20250514',
      };
    case 'router':
      return {
        conditions: (data as Record<string, unknown>)['conditions'] ?? [],
        defaultTarget: (data as Record<string, unknown>)['defaultTarget'] ?? '',
      };
    case 'input':
      return {
        inputType: (data as Record<string, unknown>)['inputType'] ?? 'text',
        label: data.label ?? 'Input',
        placeholder: (data as Record<string, unknown>)['placeholder'] ?? '',
      };
    case 'output':
      return {
        outputType: (data as Record<string, unknown>)['outputType'] ?? 'text',
        label: data.label ?? 'Output',
      };
    default:
      return defaults;
  }
}
