// Unified API Response Utilities

import type { ApiResponse } from '../types';

// CORS allowed origins whitelist
const ALLOWED_ORIGINS = [
  'http://localhost:8788',
  'http://localhost:8787',
  'https://db-card-staging.csw30454.workers.dev',
  'https://db-card.moda.gov.tw'
];

/**
 * Get CORS headers based on request origin
 * Only allows whitelisted origins
 */
function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };
  }

  // Not in whitelist, no CORS headers
  return {};
}

export function jsonResponse<T>(data: T, status: number = 200, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {};

  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

export function errorResponse(code: string, message: string, status: number = 400, request?: Request): Response {
  const response: ApiResponse = {
    success: false,
    error: { code, message }
  };

  const corsHeaders = request ? getCorsHeaders(request) : {};

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

export function htmlResponse(html: string, status: number = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
