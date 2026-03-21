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

export default router;
