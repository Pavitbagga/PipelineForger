import { Router, Request, Response } from "express";
import { askClaude } from "../lib/claude";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { pipeline } = req.body;
  if (!pipeline) {
    res.status(400).json({ error: "pipeline is required" });
    return;
  }
  try {
    const prompt = `Scan this AI pipeline for ethics risks. Return ONLY a JSON array with no markdown or explanation.
Each risk should have: { "nodeId": string, "risk": string, "severity": "low"|"medium"|"high" }
Return [] if no risks found.

Pipeline: ${JSON.stringify(pipeline)}`;
    const raw = await askClaude("You are an AI ethics auditor.", prompt);
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, '').trim();
    const risks = JSON.parse(clean);
    res.json({ risks: Array.isArray(risks) ? risks : [] });
  } catch (err: any) {
    res.json({ risks: [] });
  }
});

export default router;
