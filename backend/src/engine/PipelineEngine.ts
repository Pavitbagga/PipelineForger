import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import type {
  PipelineSchema,
  EngineNode,
  EngineEdge,
  StepEvent,
  ExecutionResult,
  RouterConfig,
  RouterCondition,
  LLMConfig,
  ToolConfig,
  AgentConfig,
  InputConfig,
  OutputConfig,
} from '../types/engine';

export class PipelineEngine {
  private pipeline: PipelineSchema;
  private anthropic: Anthropic;
  private routingDecisions: Map<string, string> = new Map();

  constructor(pipeline: PipelineSchema, anthropicApiKey: string) {
    this.pipeline = pipeline;
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
  }

  // ── Topological sort (Kahn's algorithm) ──────────────────────────────────────

  private topologicalSort(nodes: EngineNode[], edges: EngineEdge[]): EngineNode[] {
    const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
    const adj = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

    for (const e of edges) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      adj.get(e.source)?.push(e.target);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: EngineNode[] = [];
    const nodeMap = new Map<string, EngineNode>(nodes.map((n) => [n.id, n]));

    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodeMap.get(id);
      if (node) sorted.push(node);
      for (const neighbor of adj.get(id) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Pipeline contains a cycle');
    }

    return sorted;
  }

  // ── Default config applicator ────────────────────────────────────────────────
  // ADD THIS: called at the top of executeNode to ensure config is never empty.

  private applyDefaults(node: EngineNode): EngineNode {
    const cfg = node.config as unknown as Record<string, unknown> | null | undefined;
    const isEmpty = !cfg || Object.keys(cfg).length === 0;

    switch (node.type) {
      case 'llm': {
        const defaults: LLMConfig = {
          model: 'claude-sonnet-4-20250514',
          systemPrompt: 'You are a helpful assistant.',
          temperature: 0.7,
          maxTokens: 1000,
        };
        if (isEmpty) return { ...node, config: defaults };
        return {
          ...node,
          config: {
            model: (cfg!['model'] as LLMConfig['model']) ?? defaults.model,
            systemPrompt: (cfg!['systemPrompt'] as string) ?? defaults.systemPrompt,
            temperature: (cfg!['temperature'] as number) ?? defaults.temperature,
            maxTokens: (cfg!['maxTokens'] as number) ?? defaults.maxTokens,
          } satisfies LLMConfig,
        };
      }

      case 'tool': {
        const defaults: ToolConfig = {
          toolType: 'web_search',
        };
        if (isEmpty) return { ...node, config: defaults };
        return {
          ...node,
          config: {
            toolType: (cfg!['toolType'] as ToolConfig['toolType']) ?? defaults.toolType,
            parameters: cfg!['parameters'] as Record<string, string> | undefined,
          } satisfies ToolConfig,
        };
      }

      case 'agent': {
        const defaults: AgentConfig = {
          goal: 'Complete the task provided by the user.',
          tools: [],
          maxSteps: 3,
          model: 'claude-sonnet-4-20250514',
        };
        if (isEmpty) return { ...node, config: defaults };
        return {
          ...node,
          config: {
            goal: (cfg!['goal'] as string) ?? defaults.goal,
            tools: (cfg!['tools'] as string[]) ?? defaults.tools,
            maxSteps: (cfg!['maxSteps'] as number) ?? defaults.maxSteps,
            model: (cfg!['model'] as string) ?? defaults.model,
          } satisfies AgentConfig,
        };
      }

      case 'router': {
        // Find first non-router downstream node as fallback defaultTarget
        const firstNonRouter = this.pipeline.nodes.find(
          (n) => n.id !== node.id && n.type !== 'router'
        );
        const defaults: RouterConfig = {
          conditions: [],
          defaultTarget: firstNonRouter?.id ?? '',
        };
        if (isEmpty) return { ...node, config: defaults };
        return {
          ...node,
          config: {
            conditions: (cfg!['conditions'] as RouterCondition[]) ?? defaults.conditions,
            defaultTarget: (cfg!['defaultTarget'] as string) || defaults.defaultTarget,
          } satisfies RouterConfig,
        };
      }

      case 'input': {
        if (isEmpty)
          return { ...node, config: { inputType: 'text', label: 'Input' } satisfies InputConfig };
        return node;
      }

      case 'output': {
        if (isEmpty)
          return { ...node, config: { outputType: 'text', label: 'Output' } satisfies OutputConfig };
        return node;
      }

      default:
        return node;
    }
  }

  // ── Router target resolution ──────────────────────────────────────────────────

  private resolveRouterTarget(node: EngineNode, input: string): string {
    const config = node.config as RouterConfig;

    for (const condition of config.conditions) {
      if (this.evaluateCondition(condition, input)) {
        return condition.targetNodeId;
      }
    }

    return config.defaultTarget;
  }

  private evaluateCondition(condition: RouterCondition, input: string): boolean {
    switch (condition.operator) {
      case 'contains':
        return input.toLowerCase().includes(condition.value.toLowerCase());
      case 'equals':
        return input.trim() === condition.value.trim();
      case 'starts_with':
        return input.startsWith(condition.value);
      case 'ends_with':
        return input.endsWith(condition.value);
      case 'greater_than':
        return parseFloat(input) > parseFloat(condition.value);
      case 'less_than':
        return parseFloat(input) < parseFloat(condition.value);
      default:
        return false;
    }
  }

  // ── Node execution ────────────────────────────────────────────────────────────

  private async executeNode(node: EngineNode, input: string): Promise<string> {
    // ADD THIS: fill in any missing config fields with safe defaults before dispatch
    node = this.applyDefaults(node);

    switch (node.type) {
      case 'input': {
        // Entry point — pass input through unchanged
        return input;
      }

      case 'llm': {
        const config = node.config as LLMConfig;
        try {
          const response = await this.anthropic.messages.create({
            model: config.model,
            max_tokens: config.maxTokens ?? 1000,
            system: config.systemPrompt,
            messages: [{ role: 'user', content: input }],
          });
          const block = response.content[0];
          if (block.type !== 'text') {
            throw new Error(`LLM node "${node.id}" returned unexpected content type: ${block.type}`);
          }
          return block.text;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`LLM node "${node.id}" failed: ${message}`);
        }
      }

      case 'tool': {
        const config = node.config as ToolConfig;
        switch (config.toolType) {
          case 'web_search':
            // Stub — wire up SerpAPI or Brave Search API here
            return `[Web search results for: ${input}] — Wire up SerpAPI or Brave Search API here`;
          case 'code_executor':
            // Stub — wire up a sandboxed code execution environment here
            return `[Code execution result for: ${input}] — Wire up a sandboxed executor here`;
          case 'file_reader':
            // Stub — wire up file system or object storage access here
            return `[File contents for: ${input}] — Wire up file storage access here`;
          case 'api_caller':
            // Stub — wire up HTTP client with config.parameters here
            return `[API call result for: ${input}] — Wire up HTTP API caller here`;
          default: {
            const exhaustive: never = config.toolType;
            throw new Error(`Unknown tool type: ${exhaustive}`);
          }
        }
      }

      case 'agent': {
        const config = node.config as AgentConfig;
        try {
          const response = await this.anthropic.messages.create({
            model: config.model || 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: [
              `You are an autonomous agent.`,
              `Goal: ${config.goal}`,
              `Available tools: ${config.tools.join(', ')}`,
              `Max reasoning steps: ${config.maxSteps}`,
              `Think step by step. Show your reasoning.`,
              `Provide a clear final answer.`,
            ].join('\n'),
            messages: [{ role: 'user', content: input }],
          });
          const block = response.content[0];
          if (block.type !== 'text') {
            throw new Error(`Agent node "${node.id}" returned unexpected content type: ${block.type}`);
          }
          return block.text;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Agent node "${node.id}" failed: ${message}`);
        }
      }

      case 'router': {
        const targetNodeId = this.resolveRouterTarget(node, input);
        // Store routing decision so run() can skip the non-chosen branches
        this.routingDecisions.set(node.id, targetNodeId);
        // Return input unchanged — routing changes execution path, not data
        return input;
      }

      case 'output': {
        // Terminal node — pass final value through unchanged
        return input;
      }

      default: {
        const exhaustive: never = node.type;
        throw new Error(`Unknown node type: ${exhaustive}`);
      }
    }
  }

  // ── Main run method ───────────────────────────────────────────────────────────

  async run(
    input: string,
    onStep?: (event: StepEvent) => void
  ): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startedAt = new Date().toISOString();
    const steps: StepEvent[] = [];

    // Reset routing decisions for this run
    this.routingDecisions = new Map();

    const sortedNodes = this.topologicalSort(this.pipeline.nodes, this.pipeline.edges);

    // Build adjacency: node id → direct successor node ids
    const successors = new Map<string, string[]>(sortedNodes.map((n) => [n.id, []]));
    for (const e of this.pipeline.edges) {
      successors.get(e.source)?.push(e.target);
    }

    // Build predecessor map: node id → [sourceNodeId] list
    const predecessors = new Map<string, string[]>(sortedNodes.map((n) => [n.id, []]));
    for (const e of this.pipeline.edges) {
      predecessors.get(e.target)?.push(e.source);
    }

    // Nodes explicitly skipped due to routing
    const skippedNodes = new Set<string>();

    let currentValue = input;
    let executionStatus: 'success' | 'error' | 'partial' = 'success';

    for (const node of sortedNodes) {
      // Determine if this node should be skipped ──────────────────────────────
      let shouldSkip = skippedNodes.has(node.id);

      if (!shouldSkip) {
        // Check if any predecessor router chose a different path
        for (const predId of predecessors.get(node.id) ?? []) {
          const predNode = sortedNodes.find((n) => n.id === predId);
          if (predNode?.type === 'router' && this.routingDecisions.has(predId)) {
            const chosenTarget = this.routingDecisions.get(predId)!;
            if (chosenTarget !== node.id) {
              shouldSkip = true;
              break;
            }
          }
        }
      }

      if (shouldSkip) {
        const skippedEvent: StepEvent = {
          nodeId: node.id,
          nodeType: node.type,
          status: 'skipped',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 0,
        };
        onStep?.(skippedEvent);
        steps.push(skippedEvent);

        // Propagate skip to successors
        for (const succId of successors.get(node.id) ?? []) {
          skippedNodes.add(succId);
        }
        continue;
      }

      // Execute this node ──────────────────────────────────────────────────────
      const nodeStartedAt = new Date().toISOString();
      const nodeStartMs = Date.now();

      const runningEvent: StepEvent = {
        nodeId: node.id,
        nodeType: node.type,
        status: 'running',
        input: currentValue,
        startedAt: nodeStartedAt,
      };
      onStep?.(runningEvent);

      try {
        const output = await this.executeNode(node, currentValue);
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - nodeStartMs;

        const successEvent: StepEvent = {
          nodeId: node.id,
          nodeType: node.type,
          status: 'success',
          input: currentValue,
          output,
          startedAt: nodeStartedAt,
          completedAt,
          durationMs,
        };
        onStep?.(successEvent);
        steps.push(successEvent);

        currentValue = output;
      } catch (err) {
        const completedAt = new Date().toISOString();
        const durationMs = Date.now() - nodeStartMs;
        const errorMessage = err instanceof Error ? err.message : String(err);

        const errorEvent: StepEvent = {
          nodeId: node.id,
          nodeType: node.type,
          status: 'error',
          input: currentValue,
          error: errorMessage,
          startedAt: nodeStartedAt,
          completedAt,
          durationMs,
        };
        onStep?.(errorEvent);
        steps.push(errorEvent);

        executionStatus = 'error';
        // Stop execution on first error
        throw new Error(`Pipeline execution failed at node "${node.id}": ${errorMessage}`);
      }
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs = Date.now() - new Date(startedAt).getTime();

    return {
      executionId,
      pipelineId: this.pipeline.id,
      pipelineName: this.pipeline.name,
      status: executionStatus,
      finalOutput: currentValue,
      steps,
      startedAt,
      completedAt,
      totalDurationMs,
      inputProvided: input,
    };
  }
}
