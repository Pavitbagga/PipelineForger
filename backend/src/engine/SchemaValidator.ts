import type { EngineNode, EngineEdge } from '../types/engine';

const VALID_NODE_TYPES = new Set(['input', 'llm', 'tool', 'agent', 'router', 'output']);
const VALID_LLM_MODELS = new Set(['claude-sonnet-4-20250514', 'gpt-4', 'gemini-pro']);

function detectCycle(nodes: EngineNode[], edges: EngineEdge[]): boolean {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const list = adj.get(e.source);
    if (list) list.push(e.target);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>(nodes.map((n) => [n.id, WHITE]));
  function dfs(id: string): boolean {
    color.set(id, GRAY);
    for (const neighbor of adj.get(id) ?? []) {
      if (color.get(neighbor) === GRAY) return true;
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(id, BLACK);
    return false;
  }
  for (const n of nodes) {
    if (color.get(n.id) === WHITE && dfs(n.id)) return true;
  }
  return false;
}

// CHANGE THIS: return type now includes a warnings field
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

function isEmptyConfig(config: unknown): boolean {
  return (
    config === undefined ||
    config === null ||
    (typeof config === 'object' && Object.keys(config as object).length === 0)
  );
}

export class SchemaValidator {
  // CHANGE THIS: signature returns ValidationResult instead of { valid: boolean; errors: string[] }
  static validate(data: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. data is an object and not null
    if (typeof data !== 'object' || data === null) {
      errors.push('Pipeline must be a non-null object');
      return { valid: false, errors, warnings };
    }

    const d = data as Record<string, unknown>;

    // 2. pipeline_version — soft warning, not a blocker
    if (typeof d['pipeline_version'] !== 'string') {
      warnings.push('pipeline_version is missing or not a string — defaulting to "1.0"');
    }

    // 3. nodes is a non-empty array — structural error
    if (!Array.isArray(d['nodes'])) {
      errors.push('nodes must be an array');
      return { valid: false, errors, warnings };
    }
    if ((d['nodes'] as unknown[]).length === 0) {
      errors.push('nodes array must not be empty');
    }

    // 4. edges is an array — structural error
    if (!Array.isArray(d['edges'])) {
      errors.push('edges must be an array');
      return { valid: false, errors, warnings };
    }

    const nodes = d['nodes'] as unknown[];
    const edges = d['edges'] as unknown[];
    const nodeIds = new Set<string>();

    // 5 & 6. Every node has id and type — structural errors.
    //         Missing or empty config is a WARNING, not an error.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (typeof n !== 'object' || n === null) {
        errors.push(`Node at index ${i} must be an object`);
        continue;
      }
      const node = n as Record<string, unknown>;

      if (typeof node['id'] !== 'string' || !node['id']) {
        // CHANGE THIS: missing id is still a structural error
        errors.push(`Node at index ${i} is missing a string id`);
      } else {
        if (nodeIds.has(node['id'] as string)) {
          errors.push(`Duplicate node id: "${node['id']}"`);
        }
        nodeIds.add(node['id'] as string);
      }

      if (typeof node['type'] !== 'string' || !VALID_NODE_TYPES.has(node['type'] as string)) {
        // CHANGE THIS: invalid type is still a structural error
        errors.push(`Node "${node['id'] ?? i}" has invalid type: "${node['type']}"`);
      }

      // CHANGE THIS: missing/empty config is now a WARNING, not an error
      if (isEmptyConfig(node['config'])) {
        warnings.push(
          `Node "${node['id'] ?? i}" (${node['type'] ?? 'unknown'}) has no configuration. ` +
          `Default values will be used.`
        );
      }
    }

    // 7 & 8. Every edge has id, source, target — structural errors
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      if (typeof e !== 'object' || e === null) {
        errors.push(`Edge at index ${i} must be an object`);
        continue;
      }
      const edge = e as Record<string, unknown>;

      if (typeof edge['id'] !== 'string') errors.push(`Edge at index ${i} is missing a string id`);
      if (typeof edge['source'] !== 'string') {
        errors.push(`Edge at index ${i} is missing a string source`);
      } else if (!nodeIds.has(edge['source'] as string)) {
        errors.push(`Edge "${edge['id']}" source "${edge['source']}" does not reference a known node`);
      }
      if (typeof edge['target'] !== 'string') {
        errors.push(`Edge at index ${i} is missing a string target`);
      } else if (!nodeIds.has(edge['target'] as string)) {
        errors.push(`Edge "${edge['id']}" target "${edge['target']}" does not reference a known node`);
      }
    }

    // 9. Exactly one input node — structural error
    const inputNodes = (nodes as Record<string, unknown>[]).filter((n) => n['type'] === 'input');
    if (inputNodes.length !== 1) {
      errors.push(`Pipeline must have exactly one input node (found ${inputNodes.length})`);
    }

    // 10. Exactly one output node — structural error
    const outputNodes = (nodes as Record<string, unknown>[]).filter((n) => n['type'] === 'output');
    if (outputNodes.length !== 1) {
      errors.push(`Pipeline must have exactly one output node (found ${outputNodes.length})`);
    }

    // If we have structural errors stop here — no point doing deeper checks
    if (errors.length > 0) return { valid: false, errors, warnings };

    const typedNodes = nodes as EngineNode[];
    const typedEdges = edges as EngineEdge[];

    // 11. No cycles — structural error
    if (detectCycle(typedNodes, typedEdges)) {
      errors.push('Pipeline contains a cycle');
    }

    // 12 & 13. LLM model / router config checks are now WARNINGS only
    //          PipelineEngine.applyDefaults() will fill in sensible values.
    for (const node of typedNodes) {
      if (node.type === 'llm') {
        const config = node.config as unknown as Record<string, unknown> | undefined;
        if (
          !config ||
          typeof config['model'] !== 'string' ||
          !VALID_LLM_MODELS.has(config['model'])
        ) {
          // CHANGE THIS: was an error, now a warning
          warnings.push(
            `LLM node "${node.id}" has no model set. ` +
            `Defaulting to claude-sonnet-4-20250514.`
          );
        }
      }

      if (node.type === 'router') {
        const config = node.config as unknown as Record<string, unknown> | undefined;
        if (!config || !Array.isArray(config['conditions'])) {
          // CHANGE THIS: was an error, now a warning
          warnings.push(
            `Router node "${node.id}" has no conditions. ` +
            `It will route to the default target.`
          );
        }
        if (!config || typeof config['defaultTarget'] !== 'string' || !nodeIds.has(config['defaultTarget'] as string)) {
          // CHANGE THIS: was an error, now a warning
          warnings.push(
            `Router node "${node.id}" has no valid defaultTarget. ` +
            `The first downstream node will be used.`
          );
        }
      }
    }

    return errors.length === 0
      ? { valid: true, errors: [], warnings }
      : { valid: false, errors, warnings };
  }
}
