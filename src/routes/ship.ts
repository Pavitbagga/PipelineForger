import { Router, Request, Response } from 'express';
import { askClaude } from '../lib/claude';

const router = Router();

const SYSTEM_PROMPT = `You are an expert Python developer. Convert AI pipeline JSON into clean, runnable Python.
Rules:
- Use anthropic, openai, requests libraries directly. NO LangChain, NO Flowise.
- Well-commented, production-quality code.
- Load all API keys from environment variables via os.getenv().
- Include a main() function that runs the full pipeline.
- Return ONLY the Python code, no markdown, no backticks.`;

router.post('/', async (req: Request, res: Response) => {
  const { nodes, edges } = req.body;

  if (!nodes || !edges) {
    res.status(400).json({ error: 'nodes and edges are required' });
    return;
  }

  try {
    const code = await askClaude(
      SYSTEM_PROMPT,
      `Convert this pipeline to Python code: ${JSON.stringify({ nodes, edges })}`
    );

    // Extract environment variable names the generated code needs
    const keyMatches = code.match(/os\.getenv\(['"](\w+)['"]\)/g) ?? [];
    const requiredKeys = [
      ...new Set(
        keyMatches
          .map(m => m.match(/['"](\w+)['"]/)?.[1])
          .filter((k): k is string => !!k)
      ),
    ];

    res.json({ code, requiredKeys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
