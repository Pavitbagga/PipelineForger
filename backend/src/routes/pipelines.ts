import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /api/pipelines — fetch all pipelines for the authenticated user
router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[pipelines:GET] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to fetch pipelines' });
      return;
    }

    res.json(data ?? []);
  } catch (err) {
    console.error('[pipelines:GET] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pipelines — create a new pipeline
router.post('/', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { name, nodes, edges, description } = req.body as {
    name: string;
    nodes: unknown;
    edges: unknown;
    description?: string;
  };

  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .insert({
        user_id: req.user.id,
        name,
        nodes: nodes ?? [],
        edges: edges ?? [],
        description: description ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[pipelines:POST] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to create pipeline' });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[pipelines:POST] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/pipelines/:id — update a pipeline (only if owned by user)
router.put('/:id', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { id } = req.params;
  const { name, nodes, edges, description } = req.body as {
    name?: string;
    nodes?: unknown;
    edges?: unknown;
    description?: string;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates['name'] = name;
  if (nodes !== undefined) updates['nodes'] = nodes;
  if (edges !== undefined) updates['edges'] = edges;
  if (description !== undefined) updates['description'] = description;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('pipelines')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id) // enforce ownership
      .select()
      .single();

    if (error) {
      console.error('[pipelines:PUT] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to update pipeline' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }

    res.json(data);
  } catch (err) {
    console.error('[pipelines:PUT] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/pipelines/:id — delete a pipeline (only if owned by user)
router.delete('/:id', async (req, res) => {
  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Database not configured' });
    return;
  }

  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from('pipelines')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id); // enforce ownership

    if (error) {
      console.error('[pipelines:DELETE] Supabase error:', error.message);
      res.status(500).json({ error: 'Failed to delete pipeline' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[pipelines:DELETE] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
