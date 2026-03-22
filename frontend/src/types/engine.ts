// Shared pipeline engine types — used by both frontend and backend.

export type NodeType = 'input' | 'llm' | 'tool' | 'agent' | 'router' | 'output';

// ── Node config variants ──────────────────────────────────────────────────────

export interface LLMConfig {
  model: 'claude-sonnet-4-20250514' | 'gpt-4' | 'gemini-pro';
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
}

export interface ToolConfig {
  toolType: 'web_search' | 'code_executor' | 'file_reader' | 'api_caller';
  parameters?: Record<string, string>;
}

export interface AgentConfig {
  goal: string;
  tools: string[];
  maxSteps: number;
  model: string;
}

export interface RouterCondition {
  id: string;
  field: string;
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
  targetNodeId: string;
}

export interface RouterConfig {
  conditions: RouterCondition[];
  defaultTarget: string;
}

export interface InputConfig {
  inputType: 'text' | 'json' | 'file';
  label: string;
  placeholder?: string;
}

export interface OutputConfig {
  outputType: 'text' | 'json' | 'markdown';
  label: string;
}

export type NodeConfig =
  | LLMConfig
  | ToolConfig
  | AgentConfig
  | RouterConfig
  | InputConfig
  | OutputConfig;

// ── Core graph types ──────────────────────────────────────────────────────────

export interface EngineNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: NodeConfig;
  inputs: string[];
  outputs: string[];
  label?: string;
}

export interface EngineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PipelineSchema {
  pipeline_version: string;
  id: string;
  name: string;
  created_at: string;
  nodes: EngineNode[];
  edges: EngineEdge[];
}

// ── Execution types ───────────────────────────────────────────────────────────

export interface StepEvent {
  nodeId: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  input?: string;
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokenCount?: number;
}

export interface ExecutionResult {
  executionId: string;
  pipelineId: string;
  pipelineName: string;
  status: 'success' | 'error' | 'partial';
  finalOutput: string;
  steps: StepEvent[];
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  inputProvided: string;
}
