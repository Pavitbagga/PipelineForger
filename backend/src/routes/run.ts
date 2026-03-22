import { Router, Request, Response } from 'express';
import { topologicalSort, executeNode, PipelineNode, PipelineEdge } from '../lib/executor';

const router = Router();

const MAX_INPUT_LENGTH = 1000;

const INJECTION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /ignore\s+(all\s+|previous\s+|your\s+)?(instructions|rules|guidelines|system\s+prompt)/i, reason: 'Instruction override detected' },
  { pattern: /disregard\s+(all\s+|previous\s+|your\s+)?(instructions|rules|guidelines)/i, reason: 'Instruction override detected' },
  { pattern: /forget\s+(your\s+|all\s+)?(training|instructions|rules|previous)/i, reason: 'Instruction override detected' },
  { pattern: /you\s+are\s+now\s+(a\s+|an\s+)?(?!running|executing|processing)/i, reason: 'Role reassignment detected' },
  { pattern: /new\s+(system\s+)?instruction[s]?[\s:]/i, reason: 'System instruction injection detected' },
  { pattern: /\[system\]/i, reason: 'System tag injection detected' },
  { pattern: /\n\s*(human|assistant|system)\s*:/i, reason: 'Role injection pattern detected' },
  { pattern: /###\s*(instruction|system|prompt)/i, reason: 'Prompt delimiter injection detected' },
  { pattern: /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/i, reason: 'Model control token detected' },
  { pattern: /jailbreak/i, reason: 'Jailbreak attempt detected' },
];

function validateInput(input: string): string | null {
  if (typeof input !== 'string') return 'Input must be a string';
  if (input.trim().length === 0) return 'Input cannot be empty';
  if (input.length > MAX_INPUT_LENGTH) return `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters`;
  for (const { pattern, reason } of INJECTION_PATTERNS) {
    if (pattern.test(input)) return reason;
  }
  return null;
}

function sanitizeInput(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '').trim();
}

/**
 * POST /api/run
 * Streams execution results via Server-Sent Events.
 *
 * Frontend consumption example:
 *   const res = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodes, edges, input }) });
 *   const reader = res.body.getReader();
 *   const decoder = new TextDecoder();
 *   while (true) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     for (const line of decoder.decode(value).split('\n')) {
 *       if (line.startsWith('data: ')) {
 *         const event = JSON.parse(line.slice(6));
 *         // { nodeId, status: 'running'|'success'|'error', output? }
 *       }
 *     }
 *   }
 */
router.post('/', async (req: Request, res: Response) => {
  const { nodes, edges, input } = req.body as {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
    input: string;
  };

  if (!nodes || !edges || input === undefined) {
    res.status(400).json({ error: 'nodes, edges, and input are required' });
    return;
  }

  const inputError = validateInput(input);
  if (inputError) {
    res.status(400).json({ error: inputError });
    return;
  }

  const safeInput = sanitizeInput(input);

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  let sorted: PipelineNode[];
  try {
    sorted = topologicalSort(nodes, edges);
  } catch (err: any) {
    send({ status: 'fatal', error: err.message });
    res.end();
    return;
  }

  let currentValue = safeInput;

  for (const node of sorted) {
    send({ nodeId: node.id, status: 'running' });

    try {
      currentValue = await executeNode(node, currentValue);
      send({ nodeId: node.id, status: 'success', output: currentValue });
    } catch (err: any) {
      send({ nodeId: node.id, status: 'error', error: err.message });
      res.end();
      return;
    }
  }

  send({ status: 'complete', finalOutput: currentValue });
  res.end();
});

export default router;
