import { Router, Request, Response } from 'express';
import { askClaude } from '../lib/claude';

const router = Router();

const SYSTEM_PROMPT = `You are an AI pipeline architect. Given a user's goal, return ONLY a valid JSON object with no markdown, no explanation, no backticks. The JSON must follow this exact shape:
{
  "nodes": [
    {
      "id": "node_1",
      "type": "input|llm|tool|agent|router|output",
      "position": { "x": number, "y": number },
      "config": {
        "model": "claude-sonnet-4-20250514",
        "systemPrompt": "optional",
        "temperature": 0.7,
        "toolType": "optional"
      },
      "inputs": [],
      "outputs": []
    }
  ],
  "edges": [
    { "id": "edge_1", "source": "node_id", "target": "node_id" }
  ]
}
Available node types: input, llm, tool, agent, router, output
Available models: claude-sonnet-4-20250514, gpt-4, gemini-pro
Available tools: web_search, code_executor, file_reader, api_caller
Space nodes 250px apart horizontally. Start at x:100, y:300.
Always include at least one input node and one output node.`;

router.post('/', async (req: Request, res: Response) => {
  const { description } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'description is required' });
    return;
  }

  try {
    const raw = await askClaude(SYSTEM_PROMPT, `Build a pipeline for: ${description}`);
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err: any) {
    console.error('[intent] Failed to parse Claude response:', err.message);
    res.status(500).json({ error: 'Failed to generate pipeline', details: err.message });
  }
});

export default router;
