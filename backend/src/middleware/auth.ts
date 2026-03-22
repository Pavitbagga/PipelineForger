import type { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabase';

// Extend Express Request so TypeScript knows req.user exists after this middleware
declare global {
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const {
    data: { user },
    error,
  } = await supabaseAdmin!.auth.getUser(token);

  if (error || !user) {
    console.error('[auth] Token validation failed:', error?.message);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.user = user;
  next();
}
