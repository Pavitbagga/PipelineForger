import { Router, Request, Response } from 'express';
import { topologicalSort, executeNode, PipelineNode, PipelineEdge } from '../lib/executor';

const router = Router();

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

  let currentValue = input;

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
