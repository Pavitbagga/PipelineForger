import { Router, Request, Response } from 'express';
import { askClaude } from '../lib/claude';
import { checkCompatibility } from '../lib/compatibility';

const router = Router();

/** POST /api/copilot/node-drop — hint when user places a new node */
router.post('/node-drop', async (req: Request, res: Response) => {
  const { nodeType } = req.body;

  if (!nodeType) {
    res.status(400).json({ error: 'nodeType is required' });
    return;
  }

  try {
    const suggestion = await askClaude(
      'You are a concise AI pipeline assistant. Give a 1-2 sentence suggestion for how to configure this node type well. Be practical, not generic.',
      `The user just placed a "${nodeType}" node. What is the most important thing to configure on it?`
    );
    res.json({ suggestion });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/copilot/edge-draw — validate connection between two nodes */
router.post('/edge-draw', async (req: Request, res: Response) => {
  const { sourceType, targetType } = req.body;

  if (!sourceType || !targetType) {
    res.status(400).json({ error: 'sourceType and targetType are required' });
    return;
  }

  const { compatible, reason } = checkCompatibility(sourceType, targetType);
  let explanation = reason;

  if (!compatible) {
    try {
      explanation = await askClaude(
        'You are a concise AI pipeline assistant. Explain data type mismatches in plain English in 1-2 sentences.',
        `A user connected a "${sourceType}" node to a "${targetType}" node. The issue: ${reason}. Explain the problem and suggest a fix.`
      );
    } catch {
      // fall back to raw reason if Claude fails
    }
  }

  res.json({ compatible, explanation });
});

/** POST /api/copilot/scan — ethics/safety review of the entire pipeline */
router.post('/scan', async (req: Request, res: Response) => {
  const { nodes, edges } = req.body;

  if (!nodes || !edges) {
    res.status(400).json({ error: 'nodes and edges are required' });
    return;
  }

  try {
    const raw = await askClaude(
      `You are an AI safety reviewer. Analyze pipelines for: data leakage risks, missing output sanitization, prompt injection vulnerabilities, bias in prompts, external API calls without privacy consideration.
Return ONLY a JSON array, no markdown:
[{ "nodeId": "node_id", "message": "issue description", "severity": "warning|error" }]
Return [] if no issues found.`,
      `Review this pipeline: ${JSON.stringify({ nodes, edges })}`
    );

    let warnings: unknown[] = [];
    try {
      warnings = JSON.parse(raw);
    } catch {
      // Claude returned malformed JSON — treat as no warnings
    }

    res.json({ warnings });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/copilot/chat — conversational assistant with action support */
router.post('/chat', async (req: Request, res: Response) => {
  const { message, nodes, edges } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    // Build detailed pipeline context
    const pipelineContext = nodes?.length ? `
## Current Pipeline State
Nodes (${nodes.length}):
${nodes.map((n: any, i: number) => {
  const config = n.data || n.config || {};
  const details = [];
  if (config.model) details.push(`model: ${config.model}`);
  if (config.systemPrompt) details.push(`prompt: "${config.systemPrompt.substring(0, 60)}..."`);
  if (config.temperature !== undefined) details.push(`temp: ${config.temperature}`);
  if (config.toolType) details.push(`tool: ${config.toolType}`);
  if (config.goal) details.push(`goal: "${config.goal.substring(0, 40)}..."`);

  return `${i + 1}. [${n.id}] ${n.type.toUpperCase()}${details.length ? ` (${details.join(', ')})` : ''}`;
}).join('\n')}

Connections (${edges?.length || 0}):
${edges?.length ? edges.map((e: any) => `  ${e.source} → ${e.target}`).join('\n') : '  (No connections yet)'}
` : '\n## Current Pipeline State\nEmpty pipeline - no nodes yet\n';

    const systemPrompt = `You are Forge Copilot, an expert AI assistant for the PipelineForger visual pipeline builder.

## Your Capabilities
1. **Answer questions** about pipeline architecture, node configuration, and best practices
2. **Suggest improvements** to optimize pipelines for specific use cases
3. **Execute actions** to modify the pipeline when explicitly requested

## Available Node Types
- **INPUT**: Entry point for user data (text, file, API input)
- **LLM**: Language model processing (Claude, GPT, Gemini) with configurable system prompts and temperature
- **TOOL**: External tool execution (web_search, code_executor, file_reader, api_caller)
- **AGENT**: Autonomous agent with goal-seeking behavior, multi-step reasoning, and tool use
- **ROUTER**: Conditional routing based on content or logic to direct data flow
- **OUTPUT**: Final result destination

## Response Format
**For questions or suggestions**: Provide clear, concise answers (2-4 sentences) referencing specific nodes by their ID when relevant.

**For action requests** (e.g., "add an LLM node", "connect input to output", "change the temperature to 0.9"):
Return a JSON object with this exact structure:
\`\`\`json
{
  "response": "Natural language confirmation of what you're doing",
  "actions": [
    {
      "type": "addNode",
      "nodeType": "llm",
      "position": {"x": 400, "y": 300},
      "config": {
        "model": "claude-sonnet",
        "systemPrompt": "You are a helpful assistant",
        "temperature": 0.7
      }
    }
  ]
}
\`\`\`

**Action Types**:
- \`addNode\`: Create a new node (requires nodeType, optional position and config)
- \`addEdge\`: Connect two nodes (requires source and target node IDs)
- \`updateNode\`: Modify existing node (requires nodeId and updates object with data/position)
- \`deleteNode\`: Remove a node (requires nodeId)

${pipelineContext}

## Instructions
- Reference specific nodes by their ID (e.g., "node_123") when discussing the pipeline
- For action requests, return ONLY valid JSON (no markdown fences, no extra text)
- For questions, return plain text
- Be concise but informative`;

    const response = await askClaude(systemPrompt, message);

    // Try to parse as JSON for structured actions
    let trimmedResponse = response.trim();

    // Strip markdown code fences if present
    if (trimmedResponse.startsWith('```json')) {
      trimmedResponse = trimmedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (trimmedResponse.startsWith('```')) {
      trimmedResponse = trimmedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(trimmedResponse);
      if (parsed.actions && Array.isArray(parsed.actions)) {
        // Structured action response - validate actions
        const validActions = parsed.actions.filter((action: any) => {
          return action.type && ['addNode', 'addEdge', 'updateNode', 'deleteNode', 'deleteEdge'].includes(action.type);
        });

        res.json({
          response: parsed.response || 'Action executed',
          actions: validActions
        });
        return;
      }
    } catch {
      // Not JSON or invalid format, treat as plain text
    }

    // Plain text response for questions
    res.json({ response: trimmedResponse });
  } catch (err: any) {
    console.error('[Copilot Chat] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
