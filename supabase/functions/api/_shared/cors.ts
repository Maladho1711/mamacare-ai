/**
 * CORS headers — Edge Function MamaCare
 * Autorise mamacare-ai.vercel.app + localhost en dev.
 */

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
};

export function corsResponse(status = 204): Response {
  return new Response(null, { status, headers: CORS_HEADERS });
}

export function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function err(message: string, status = 400): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
