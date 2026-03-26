import { Router, Request, Response } from 'express';
import { PipelineEngine } from '../engine/PipelineEngine';
import { SchemaValidator } from '../engine/SchemaValidator';
import { supabaseAdmin } from '../lib/supabase';
import type { PipelineSchema, EngineNode, EngineEdge, StepEvent, ExecutionResult } from '../types/engine';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return key;
}

function setupSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
}

function sendEvent(res: Response, data: object): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function runWithSSE(
  res: Response,
  pipeline: PipelineSchema,
  input: string
): Promise<ExecutionResult | null> {
  setupSSE(res);

  let result: ExecutionResult | null = null;

  try {
    const engine = new PipelineEngine(pipeline, getApiKey());
    result = await engine.run(input, (stepEvent: StepEvent) => {
      sendEvent(res, stepEvent);
    });
    sendEvent(res, { type: 'complete', result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendEvent(res, { type: 'error', message });
  }

  res.end();
  return result;
}

// ── Route 1: POST /validate (no requireAuth — registered separately in index.ts) ──

export async function validateHandler(req: Request, res: Response): Promise<void> {
  const { pipeline } = req.body as { pipeline: unknown };
  const result = SchemaValidator.validate(pipeline);
  res.json(result);
}

// ── Route 2: POST /run ────────────────────────────────────────────────────────

router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const { pipeline, input } = req.body as { pipeline: unknown; input: string };

  if (!input || typeof input !== 'string') {
    res.status(400).json({ error: 'input is required and must be a string' });
    return;
  }

  const validation = SchemaValidator.validate(pipeline);
  if (!validation.valid) {
    res.status(400).json({ errors: validation.errors });
    return;
  }

  await runWithSSE(res, pipeline as PipelineSchema, input);
});

// ── Route 3: POST /:pipelineId/run ───────────────────────────────────────────

router.post('/:pipelineId/run', async (req: Request, res: Response): Promise<void> => {
  const { pipelineId } = req.params;
  const { input } = req.body as { input: string };

  if (!input || typeof input !== 'string') {
    res.status(400).json({ error: 'input is required and must be a string' });
    return;
  }

  // Check if Supabase is configured
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  // Fetch saved pipeline from Supabase
  const { data: saved, error } = await supabaseAdmin
    .from('pipelines')
    .select('nodes, edges, name')
    .eq('id', pipelineId)
    .eq('user_id', req.user.id)
    .single();

  if (error || !saved) {
    res.status(404).json({ error: 'Pipeline not found' });
    return;
  }

  const pipeline: PipelineSchema = {
    pipeline_version: '1.0',
    id: pipelineId,
    name: saved.name as string,
    created_at: new Date().toISOString(),
    nodes: saved.nodes as EngineNode[],
    edges: saved.edges as EngineEdge[],
  };

  const validation = SchemaValidator.validate(pipeline);
  if (!validation.valid) {
    res.status(400).json({ errors: validation.errors });
    return;
  }

  const executionResult = await runWithSSE(res, pipeline, input);

  // Persist execution history (best-effort — do not fail the response)
  if (executionResult && supabaseAdmin) {
    supabaseAdmin
      .from('pipeline_executions')
      .insert({
        pipeline_id: pipelineId,
        user_id: req.user.id,
        input,
        final_output: executionResult.finalOutput,
        status: executionResult.status,
        duration_ms: executionResult.totalDurationMs,
        steps: executionResult.steps,
        result: executionResult,
      })
      .then(({ error: insertError }) => {
        if (insertError) {
          console.error('[engine] Failed to persist execution:', insertError.message);
        }
      });
  }
});

// ── Route 4: GET /:pipelineId/executions ─────────────────────────────────────

router.get('/:pipelineId/executions', async (req: Request, res: Response): Promise<void> => {
  const { pipelineId } = req.params;

  const { data, error } = await supabaseAdmin!
    .from('pipeline_executions')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[engine:executions] Supabase error:', error.message);
    res.status(500).json({ error: 'Failed to fetch executions' });
    return;
  }

  res.json(data ?? []);
});

export default router;
