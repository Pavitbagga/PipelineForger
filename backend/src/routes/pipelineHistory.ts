import { Router } from 'express';
import type { Request, Response } from 'express';
import { askClaude } from '../lib/claude';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// POST /api/pipelines/summarize
// Registered directly in index.ts (before /:id routes) to avoid param collision.
export async function summarizeHandler(req: Request, res: Response): Promise<void> {
  const { pipelineName, diffDescription, previousNodeCount, currentNodeCount } = req.body as {
    pipelineName: string;
    diffDescription: string;
    previousNodeCount: number;
    currentNodeCount: number;
  };

  try {
    const text = await askClaude(
      'You are a concise changelog writer for an AI pipeline builder. Write a single plain English sentence (max 15 words) describing what changed in this pipeline update. No bullet points. No markdown. Just one sentence.',
      `Pipeline name: ${pipelineName}. Changes: ${diffDescription}. Node count changed from ${previousNodeCount} to ${currentNodeCount}.`
    );
    res.json({ summary: text.trim() });
  } catch (err) {
    console.error('[summarize] Claude error:', err);
    res.json({ summary: 'Pipeline updated with structural changes.' });
  }
}

// POST /api/history/:id — save a history entry
router.post('/:id', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { summary, nodes, edges } = req.body as {
    summary: string;
    nodes: unknown[];
    edges: unknown[];
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('pipeline_history')
      .insert({
        pipeline_id: req.params.id,
        user_id: req.user.id,
        summary,
        nodes_snapshot: nodes ?? [],
        edges_snapshot: edges ?? [],
      })
      .select()
      .single();

    if (error) {
      console.error('[history:POST] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to save history entry' });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[history:POST] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/history/:id — fetch last 20 history entries
router.get('/:id', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pipeline_history')
      .select('*')
      .eq('pipeline_id', req.params.id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[history:GET] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to fetch history' });
      return;
    }

    res.json(data ?? []);
  } catch (err) {
    console.error('[history:GET] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
