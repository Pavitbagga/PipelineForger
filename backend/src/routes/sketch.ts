import { Router, Request, Response } from 'express';
import { askClaudeWithImage } from '../lib/claude';

const router = Router();

const SYSTEM_PROMPT = `You are an AI pipeline architect analyzing a hand-drawn diagram. The user drew on a dark background using light-colored lines.

Rules for interpretation:
- Rectangles or boxes = pipeline nodes
- Arrows or lines connecting boxes = edges (directed connections)
- Text labels near shapes = node type hints
- If no labels, infer node types from position/order (typically: input → processing → output)

Map shapes to these node types: input, llm, tool, agent, router, output
Available models: claude-sonnet-4-20250514, gpt-4, gemini-pro
Available tool types: web_search, code_executor, file_reader, api_caller

Return ONLY valid JSON with no markdown, no backticks, no explanation:
{
  "interpretation": "A concise human-readable description of the pipeline you see, e.g. 'Three nodes: an input node connected to a Claude LLM node, which feeds into an output node'",
  "nodes": [
    {
      "id": "node_1",
      "type": "input|llm|tool|agent|router|output",
      "position": { "x": number, "y": number },
      "config": {
        "model": "claude-sonnet-4-20250514",
        "systemPrompt": "optional system prompt",
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

Space nodes 250px apart horizontally, starting at x:100, y:300.
Always include at least one input node and one output node.
If the drawing is unclear, make a reasonable guess and describe it in the interpretation field.`;

router.post('/', async (req: Request, res: Response) => {
  const { imageBase64, feedback } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    res.status(400).json({ error: 'imageBase64 is required' });
    return;
  }

  const userMessage = feedback
    ? `Interpret this pipeline diagram. The user reviewed a previous interpretation and gave this feedback to refine it: "${feedback}"`
    : 'Interpret this pipeline diagram sketch and generate the corresponding node/edge JSON.';

  try {
    const raw = await askClaudeWithImage(SYSTEM_PROMPT, userMessage, imageBase64);
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err: any) {
    console.error('[sketch] Failed to parse Claude response:', err.message);
    res.status(500).json({ error: 'Failed to interpret sketch', details: err.message });
  }
});

export default router;
