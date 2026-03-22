import { supabase } from './supabase';

/**
 * Wraps fetch with a Supabase JWT Authorization header.
 * Use this for every call to the Express backend.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const authHeader: Record<string, string> = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  const existingHeaders =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : (options.headers as Record<string, string> | undefined) ?? {};

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...existingHeaders,
      ...authHeader,
    },
  });
}
