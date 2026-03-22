const ALLOWED_MODELS = ['claude-sonnet-4-20250514', 'gpt-4', 'gemini-pro'] as const;
const ALLOWED_TOOL_TYPES = ['web_search', 'code_executor', 'file_reader', 'api_caller'] as const;
const ALLOWED_NODE_TYPES = ['input', 'llm', 'tool', 'agent', 'router', 'output'] as const;

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)/gi,
  /\bsystem\s*:/gi,
  /\byou\s+are\s+now\s+/gi,
  /\bdo\s+not\s+follow\s+/gi,
  /<\s*script[^>]*>[\s\S]*?<\/\s*script\s*>/gi,
];

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  let s = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  for (const pattern of INJECTION_PATTERNS) {
    s = s.replace(pattern, ' ');
  }
  s = s.replace(/(\n\s*){4,}/g, '\n\n');
  return s.slice(0, maxLength).trim();
}

// Node type names used as labels — if Claude returns one of these as a label, treat it as missing
const NODE_TYPE_NAMES = new Set(['input', 'llm', 'tool', 'agent', 'router', 'output']);

function validateAndFillDefaults(node: any): any {
  const typeDefaults: Record<string, Record<string, any>> = {
    input:  { label: 'Input' },
    output: { label: 'Output' },
    llm:    { model: 'claude-sonnet-4-20250514', systemPrompt: 'You are a helpful assistant.', temperature: 0.7 },
    tool:   { toolType: 'web_search', label: 'Tool' },
    agent:  { goal: 'Complete the assigned task.', maxSteps: 5, model: 'claude-sonnet-4-20250514' },
    router: { condition: 'Route based on input content.', label: 'Router' },
  };
  const defaults = typeDefaults[node.type] ?? {};
  const raw = node.config ?? {};

  // Only accept Claude's value for a field when it's non-empty and non-trivially-wrong
  const config: Record<string, any> = { ...defaults };
  for (const [key, val] of Object.entries(raw)) {
    if (val === undefined || val === null || val === '') continue;
    // Reject bare type-name labels (e.g. label:"llm") — use the proper capitalized default instead
    if (key === 'label' && typeof val === 'string' && NODE_TYPE_NAMES.has(val.toLowerCase())) continue;
    config[key] = val;
  }

  const position = node.position ?? { x: 100, y: 300 };
  const inputs = Array.isArray(node.inputs) ? node.inputs : ['text'];
  const outputs = Array.isArray(node.outputs) ? node.outputs : ['text'];
  return { ...node, config, position, inputs, outputs };
}

function sanitizeNodeConfig(node: any): any {
  const config = { ...(node.config ?? {}) };

  if (config.model !== undefined && !(ALLOWED_MODELS as readonly string[]).includes(config.model)) {
    config.model = 'claude-sonnet-4-20250514';
  }
  if (config.toolType !== undefined && !(ALLOWED_TOOL_TYPES as readonly string[]).includes(config.toolType)) {
    config.toolType = 'web_search';
  }
  if (config.systemPrompt !== undefined) {
    const cleaned = sanitizeString(config.systemPrompt, 2000);
    config.systemPrompt = cleaned || 'You are a helpful assistant.';
  }
  if (config.goal !== undefined) {
    const cleaned = sanitizeString(config.goal, 500);
    config.goal = cleaned || 'Complete the assigned task.';
  }
  if (config.condition !== undefined) {
    const cleaned = sanitizeString(config.condition, 500);
    config.condition = cleaned || 'Route based on input content.';
  }
  if (config.label !== undefined) {
    config.label = sanitizeString(config.label, 50);
  }
  if (config.temperature !== undefined) {
    const t = Number(config.temperature);
    config.temperature = isNaN(t) ? 0.7 : Math.min(1.0, Math.max(0.0, t));
  }
  if (config.maxSteps !== undefined) {
    const s = Math.round(Number(config.maxSteps));
    config.maxSteps = isNaN(s) ? 5 : Math.min(20, Math.max(1, s));
  }

  return { ...node, config };
}

export function sanitizePipelineResponse(parsed: any): { nodes: any[]; edges: any[] } {
  const rawNodes: any[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
  const rawEdges: any[] = Array.isArray(parsed.edges) ? parsed.edges : [];

  const cleanNodes = rawNodes
    .filter((n: any) => typeof n.id === 'string' && (ALLOWED_NODE_TYPES as readonly string[]).includes(n.type))
    .map(validateAndFillDefaults)
    .map(sanitizeNodeConfig);

  const nodeIds = new Set(cleanNodes.map((n: any) => n.id));
  const cleanEdges = rawEdges.filter(
    (e: any) =>
      typeof e.id === 'string' &&
      typeof e.source === 'string' &&
      typeof e.target === 'string' &&
      nodeIds.has(e.source) &&
      nodeIds.has(e.target)
  );

  return { nodes: cleanNodes, edges: cleanEdges };
}
