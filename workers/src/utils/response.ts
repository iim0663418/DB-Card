// Unified API Response Utilities

import type { ApiResponse } from '../types';

// CORS allowed origins (will be set dynamically)
let ALLOWED_ORIGINS: string[] = [];

/**
 * Initialize allowed origins based on environment
 * Called once at worker startup
 */
export function initAllowedOrigins(workerUrl: string, environment: string): void {
  ALLOWED_ORIGINS = [
    'http://localhost:8788',
    'http://localhost:8787',
    workerUrl
  ];
  
  // Staging: support both worker and custom domain
  if (environment === 'staging') {
    ALLOWED_ORIGINS.push('https://db-card.sfan-tech.com');
  }
}

/**
 * Get CORS headers based on request origin
 * Only allows whitelisted origins
 */
export function getCorsHeaders(request: Request): HeadersInit {
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

/**
 * Public error response - minimal information to prevent information disclosure
 * Use for unauthenticated endpoints (404, 401, 403)
 * Includes standardized delay to prevent timing attacks
 */
export async function publicErrorResponse(status: number = 400, request?: Request): Promise<Response> {
  // Standardized delay to prevent timing attacks (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const corsHeaders = request ? getCorsHeaders(request) : {};

  return new Response(
    JSON.stringify({ success: false }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}

/**
 * Admin error response - moderate detail for authenticated users
 * Use for admin API endpoints after authentication
 */
export function adminErrorResponse(message: string, status: number = 400, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {};

  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  );
}

export function htmlResponse(html: string, status: number = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
