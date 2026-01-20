// IP Extraction Utility
// Based on BDD Scenario 11: IP Extraction Priority

/**
 * Extract client IP from request headers
 * Priority: CF-Connecting-IP > X-Forwarded-For (first) > "unknown"
 *
 * @param request - Incoming request object
 * @returns Client IP address or "unknown"
 */
export function getClientIP(request: Request): string {
  // Priority 1: Cloudflare's CF-Connecting-IP header
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // Priority 2: X-Forwarded-For header (take first IP)
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    const firstIP = xForwardedFor.split(',')[0].trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback: unknown
  return 'unknown';
}
