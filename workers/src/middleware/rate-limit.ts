// Rate Limiting Middleware for Error Responses and User Operations

import type { Env } from '../types';
import { anonymizeIP } from '../utils/audit';

const RATE_LIMIT_WINDOW = 60; // seconds
const MAX_ERRORS_PER_WINDOW = 20;

// User operation rate limits (per email+IP)
const USER_CREATE_LIMIT = 5;  // 5 attempts/hour
const USER_CREATE_WINDOW = 3600;  // 1 hour
const USER_EDIT_LIMIT = 20;  // 20 requests/hour
const USER_EDIT_WINDOW = 3600;  // 1 hour

/**
 * Log security event directly (simplified)
 */
async function logEvent(
  db: D1Database,
  eventType: string,
  ip: string,
  details: Record<string, any>
): Promise<void> {
  try {
    const anonymizedIP = anonymizeIP(ip);
    const detailsJson = JSON.stringify(details);

    await db.prepare(`
      INSERT INTO security_events (event_type, ip_address, details, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).bind(eventType, anonymizedIP, detailsJson).run();
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Check rate limit for user card operations
 * Scenario 6: Rate limiting for create and edit operations
 *
 * @param email - User email for rate limiting key
 * @param ip - User IP address
 * @param operation - 'create' or 'edit'
 * @returns 429 response if limit exceeded, null otherwise
 */
export async function checkUserRateLimit(
  request: Request,
  env: Env,
  email: string,
  operation: 'create' | 'edit'
): Promise<Response | null> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (ip === 'unknown') {
    return null;
  }

  // Use email+IP as key for rate limiting
  const key = `rate_limit:user_${operation}:${email}:${ip}`;
  const limit = operation === 'create' ? USER_CREATE_LIMIT : USER_EDIT_LIMIT;
  const window = operation === 'create' ? USER_CREATE_WINDOW : USER_EDIT_WINDOW;

  try {
    // Get current count
    const countStr = await env.KV?.get(key);
    const count = countStr ? parseInt(countStr) : 0;

    // Check if limit exceeded
    if (count >= limit) {
      // Log security event
      await logEvent(env.DB, `rate_limit_${operation}`, ip, {
        email,
        count,
        path: new URL(request.url).pathname
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many requests',
            retry_after: window
          }
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': window.toString()
          }
        }
      );
    }

    // Increment counter
    await env.KV?.put(key, (count + 1).toString(), {
      expirationTtl: window
    });

    return null; // Not rate limited
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return null; // Fail open
  }
}

/**
 * Check rate limit for error responses (404, 401, 403)
 * Returns 429 response if limit exceeded, null otherwise
 * Logs security events when rate limit is exceeded
 */
export async function checkRateLimit(
  request: Request,
  env: Env,
  errorType: '404' | '401' | '403'
): Promise<Response | null> {
  // Get client IP
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Skip rate limiting for unknown IPs (shouldn't happen on Cloudflare)
  if (ip === 'unknown') {
    return null;
  }

  const key = `rate_limit:${errorType}:${ip}`;
  
  try {
    // Get current count
    const countStr = await env.KV?.get(key);
    const count = countStr ? parseInt(countStr) : 0;

    // Check if limit exceeded
    if (count >= MAX_ERRORS_PER_WINDOW) {
      // Log security event
      await logEvent(env.DB, 'rate_limit_exceeded', ip, {
        error_type: errorType,
        count: count,
        path: new URL(request.url).pathname
      });

      return new Response(
        JSON.stringify({ success: false }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': RATE_LIMIT_WINDOW.toString()
          }
        }
      );
    }

    // Increment counter
    await env.KV?.put(key, (count + 1).toString(), {
      expirationTtl: RATE_LIMIT_WINDOW
    });

    // Log potential enumeration attempt (at 10 errors)
    if (count === 10) {
      await logEvent(env.DB, 'endpoint_enumeration', ip, {
        error_type: errorType,
        count: count,
        path: new URL(request.url).pathname
      });
    }

    return null; // Not rate limited
  } catch (error) {
    // If KV fails, allow request (fail open)
    console.error('Rate limit check failed:', error);
    return null;
  }
}
