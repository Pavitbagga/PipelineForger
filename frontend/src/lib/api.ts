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

  // Log session status
  if (!session) {
    console.warn('[fetchWithAuth] No Supabase session found - request will be unauthenticated');
  } else {
    console.log('[fetchWithAuth] Session found for user:', session.user?.email);
  }

  const authHeader: Record<string, string> = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};

  // Log whether token is being attached
  console.log('[fetchWithAuth] Request to:', url, 'Auth:', authHeader.Authorization ? 'YES' : 'NO');

  const existingHeaders =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : (options.headers as Record<string, string> | undefined) ?? {};

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...existingHeaders,
      ...authHeader,
    },
  });

  // Log response status
  if (!response.ok) {
    console.error('[fetchWithAuth] Request failed:', response.status, response.statusText);
  }

  return response;
}
