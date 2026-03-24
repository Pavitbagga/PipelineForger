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
  // DEV MODE: Skip auth if SKIP_AUTH=true or NODE_ENV=development
  const skipAuth = process.env.SKIP_AUTH === 'true' ||
                   process.env.NODE_ENV === 'development';

  if (skipAuth) {
    console.log('[auth] DEV MODE: Skipping authentication');
    // Create a mock user for development
    req.user = {
      id: 'dev-user-123',
      email: 'dev@localhost',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    next();
    return;
  }

  const authHeader = req.headers['authorization'];

  // Log what we received
  console.log('[auth] Authorization header:', authHeader ? 'Present' : 'Missing');

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[auth] Missing or malformed Bearer token');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "
  console.log('[auth] Validating token:', token.substring(0, 20) + '...');

  const {
    data: { user },
    error,
  } = await supabaseAdmin!.auth.getUser(token);

  if (error || !user) {
    console.error('[auth] Token validation failed:', error?.message);
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  console.log('[auth] User authenticated:', user.id);
  req.user = user;
  next();
}
