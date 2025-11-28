import type { APIRoute } from 'astro';
import { API_BASE } from '../../lib/constants';
import { validateNumber } from '../../lib/security';

const FETCH_TIMEOUT = 10000;

export const GET: APIRoute = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE}/api/getblockcount`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `HTTP error! status: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const blockCount = validateNumber(data, 0, Number.MAX_SAFE_INTEGER);

    return new Response(JSON.stringify(blockCount), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'Request timeout' }),
          { status: 504, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Failed to fetch block count' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

