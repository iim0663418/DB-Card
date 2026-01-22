// Admin Security Dashboard Handlers
// GET /api/admin/security/stats - Security statistics
// GET /api/admin/security/events - Security events list

import type { Env } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { jsonResponse, adminErrorResponse } from '../../utils/response';
import { anonymizeIP } from '../../utils/audit';

/**
 * Handle GET /api/admin/security/stats
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return 24h statistics
 * - Scenario 2: 401 - Unauthorized (missing token)
 * - Scenario 3: Success with empty data
 */
export async function handleSecurityStats(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Check cache (60 seconds)
    const cacheKey = 'security:stats:v1';
    const cached = await env.KV.get(cacheKey, 'json');
    if (cached) {
      return jsonResponse(cached, 200, request);
    }

    // Calculate 24 hours ago timestamp
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const timestamp24h = twentyFourHoursAgo.toISOString();

    // Get total events in last 24h
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total
      FROM security_events
      WHERE created_at >= ?
    `).bind(timestamp24h).first<{ total: number }>();

    const total = totalResult?.total || 0;

    // Get blocked attempts (rate_limit_exceeded)
    const blockedResult = await env.DB.prepare(`
      SELECT COUNT(*) as blocked
      FROM security_events
      WHERE created_at >= ?
        AND event_type = 'rate_limit_exceeded'
    `).bind(timestamp24h).first<{ blocked: number }>();

    const blocked = blockedResult?.blocked || 0;

    // Get suspicious IPs count (unique IPs with suspicious patterns)
    const suspiciousIPsResult = await env.DB.prepare(`
      SELECT COUNT(DISTINCT ip_address) as suspicious
      FROM security_events
      WHERE created_at >= ?
        AND event_type = 'suspicious_pattern'
    `).bind(timestamp24h).first<{ suspicious: number }>();

    const suspiciousIPs = suspiciousIPsResult?.suspicious || 0;

    // Get rate limit hits count
    const rateLimitResult = await env.DB.prepare(`
      SELECT COUNT(*) as rate_limit_hits
      FROM security_events
      WHERE created_at >= ?
        AND event_type = 'rate_limit_exceeded'
    `).bind(timestamp24h).first<{ rate_limit_hits: number }>();

    const rateLimitHits = rateLimitResult?.rate_limit_hits || 0;

    // Get top IPs (top 10 by event count)
    const topIPsResults = await env.DB.prepare(`
      SELECT ip_address as ip, COUNT(*) as event_count, MAX(created_at) as last_seen
      FROM security_events
      WHERE created_at >= ?
      GROUP BY ip_address
      ORDER BY event_count DESC
      LIMIT 10
    `).bind(timestamp24h).all();

    const topIPs = (topIPsResults.results || []).map((row: any) => ({
      ip: anonymizeIP(row.ip),
      event_count: row.event_count,
      last_seen: new Date(row.last_seen).toISOString()
    }));

    // Get last event
    const lastEventResult = await env.DB.prepare(`
      SELECT event_type, ip_address as ip, created_at
      FROM security_events
      ORDER BY created_at DESC
      LIMIT 1
    `).first<{ event_type: string; ip: string; created_at: string }>();

    const lastEvent = lastEventResult
      ? {
          event_type: lastEventResult.event_type,
          ip: anonymizeIP(lastEventResult.ip),
          created_at: new Date(lastEventResult.created_at).toISOString()
        }
      : null;

    const stats = {
      last24h: {
        total_events: total,
        blocked_attempts: blocked,
        suspicious_ips: suspiciousIPs,
        rate_limit_hits: rateLimitHits
      },
      top_ips: topIPs,
      last_event: lastEvent
    };

    // Cache for 60 seconds
    await env.KV.put(cacheKey, JSON.stringify(stats), { expirationTtl: 60 });

    return jsonResponse(stats, 200, request);
  } catch (error) {
    console.error('Error getting security stats:', error);
    return adminErrorResponse(`Internal server error: ${error}`, 500, request);
  }
}

/**
 * Handle GET /api/admin/security/events
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return event list (no filters)
 * - Scenario 2: Success - Filter by event_type
 * - Scenario 3: Success - Pagination
 * - Scenario 4: Success - Time range filter
 * - Scenario 5: 401 - Unauthorized
 */
export async function handleSecurityEvents(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Parse query parameters
    const url = new URL(request.url);
    const eventType = url.searchParams.get('event_type');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 50);
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');

    // Build WHERE clause
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (eventType) {
      conditions.push('event_type = ?');
      bindings.push(eventType);
    }

    if (startTime) {
      conditions.push('created_at >= ?');
      bindings.push(new Date(startTime).toISOString());
    }

    if (endTime) {
      conditions.push('created_at <= ?');
      bindings.push(new Date(endTime).toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM security_events
      ${whereClause}
    `;
    const countResult = await env.DB.prepare(countQuery).bind(...bindings).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get events with pagination
    const eventsQuery = `
      SELECT id, event_type, ip_address as ip, details, created_at
      FROM security_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const eventsResult = await env.DB.prepare(eventsQuery)
      .bind(...bindings, limit, offset)
      .all();

    // Parse events and extract user_agent and endpoint from details
    const events = (eventsResult.results || []).map((row: any) => {
      let parsedDetails: any = {};
      let user_agent = 'unknown';
      let endpoint = '';

      try {
        if (row.details) {
          parsedDetails = JSON.parse(row.details);
          user_agent = parsedDetails.user_agent || 'unknown';
          endpoint = parsedDetails.endpoint || '';
        }
      } catch (e) {
        // Invalid JSON, use defaults
      }

      return {
        id: row.id,
        event_type: row.event_type,
        ip: anonymizeIP(row.ip),
        user_agent,
        endpoint,
        details: row.details || '{}',
        created_at: new Date(row.created_at).toISOString()
      };
    });

    const hasMore = offset + events.length < total;

    return jsonResponse(
      {
        events,
        pagination: {
          total,
          page,
          limit,
          has_more: hasMore
        }
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error getting security events:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle GET /api/admin/security/timeline
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return 24 hour timeline
 * - Scenario 2: Success - Custom time range
 * - Scenario 3: 401 - Unauthorized
 */
export async function handleSecurityTimeline(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Parse query parameters
    const url = new URL(request.url);
    const hours = Math.min(parseInt(url.searchParams.get('hours') || '24', 10), 168); // Max 7 days

    // Check cache (5 minutes)
    const cacheKey = `security:timeline:${hours}:v1`;
    const cached = await env.KV.get(cacheKey, 'json');
    if (cached) {
      return jsonResponse(cached, 200, request);
    }

    // Calculate time range
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Query events grouped by hour
    const query = `
      SELECT
        strftime('%Y-%m-%dT%H:00:00Z', created_at) as hour,
        COUNT(*) as total,
        SUM(CASE WHEN event_type = 'rate_limit_exceeded' THEN 1 ELSE 0 END) as rate_limit,
        SUM(CASE WHEN event_type = 'suspicious_pattern' THEN 1 ELSE 0 END) as suspicious
      FROM security_events
      WHERE created_at >= ?
      GROUP BY hour
      ORDER BY hour ASC
    `;

    const result = await env.DB.prepare(query).bind(startTime.toISOString()).all();

    // Fill in missing hours with zero values
    const timeline: Array<{ hour: string; total: number; rate_limit: number; suspicious: number }> = [];
    const dataMap = new Map(
      (result.results || []).map((row: any) => [row.hour, row])
    );

    for (let i = 0; i < hours; i++) {
      const hourTime = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourKey = hourTime.toISOString().slice(0, 13) + ':00:00Z';

      const data = dataMap.get(hourKey);
      timeline.push({
        hour: hourKey,
        total: data?.total || 0,
        rate_limit: data?.rate_limit || 0,
        suspicious: data?.suspicious || 0
      });
    }

    const response = { timeline };

    // Cache for 5 minutes
    await env.KV.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });

    return jsonResponse(response, 200, request);
  } catch (error) {
    console.error('Error getting security timeline:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle POST /api/admin/security/block
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Block IP
 * - Scenario 2: Success - Permanent block
 * - Scenario 3: Success - Update existing block
 * - Scenario 4: 400 - Missing required field
 * - Scenario 5: 401 - Unauthorized
 */
export async function handleBlockIP(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Parse request body
    const body = await request.json() as { ip?: string; duration_hours?: number; reason?: string };

    // Validate required fields
    if (!body.ip) {
      return adminErrorResponse('Missing required field: ip', 400, request);
    }

    const ip = body.ip;
    const durationHours = body.duration_hours ?? 24;
    const reason = body.reason || 'Manual block';

    // Calculate blocked_until (NULL for permanent)
    const blockedUntil = durationHours > 0
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
      : null;

    // UPSERT: Insert or update existing block
    await env.DB.prepare(`
      INSERT INTO blocked_ips (ip_address, blocked_until, reason, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(ip_address) DO UPDATE SET
        blocked_until = excluded.blocked_until,
        reason = excluded.reason,
        created_at = datetime('now')
    `).bind(ip, blockedUntil, reason).run();

    return jsonResponse(
      {
        ip: anonymizeIP(ip),
        blocked_until: blockedUntil,
        reason
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error blocking IP:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle DELETE /api/admin/security/block/:ip
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Unblock IP
 * - Scenario 2: 404 - IP not found
 * - Scenario 3: 401 - Unauthorized
 */
export async function handleUnblockIP(request: Request, env: Env, ip: string): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Check if IP exists in block list
    const existing = await env.DB.prepare(`
      SELECT ip_address FROM blocked_ips WHERE ip_address = ?
    `).bind(ip).first();

    if (!existing) {
      return adminErrorResponse('IP not found in block list', 404, request);
    }

    // Delete the block
    await env.DB.prepare(`
      DELETE FROM blocked_ips WHERE ip_address = ?
    `).bind(ip).run();

    return jsonResponse(
      {
        ip: anonymizeIP(ip),
        unblocked: true
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error unblocking IP:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle GET /api/admin/security/ip/:ip
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Return IP details
 * - Scenario 2: Success - IP with no events
 * - Scenario 3: 401 - Unauthorized
 */
export async function handleIPDetail(request: Request, env: Env, ip: string): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Check if IP is blocked
    const blockInfo = await env.DB.prepare(`
      SELECT blocked_until, reason
      FROM blocked_ips
      WHERE ip_address = ?
    `).bind(ip).first<{ blocked_until: string | null; reason: string }>();

    const isBlocked = !!blockInfo;
    const blockData = blockInfo
      ? {
          blocked_until: blockInfo.blocked_until,
          reason: blockInfo.reason
        }
      : {
          blocked_until: null,
          reason: ''
        };

    // Get statistics
    const statsResult = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_events,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        SUM(CASE WHEN event_type = 'rate_limit_exceeded' THEN 1 ELSE 0 END) as rate_limit_count,
        SUM(CASE WHEN event_type = 'suspicious_pattern' THEN 1 ELSE 0 END) as suspicious_count
      FROM security_events
      WHERE ip_address = ?
    `).bind(ip).first<{
      total_events: number;
      first_seen: string | null;
      last_seen: string | null;
      rate_limit_count: number;
      suspicious_count: number;
    }>();

    const statistics = {
      total_events: statsResult?.total_events || 0,
      first_seen: statsResult?.first_seen ? new Date(statsResult.first_seen).toISOString() : null,
      last_seen: statsResult?.last_seen ? new Date(statsResult.last_seen).toISOString() : null,
      event_types: {
        rate_limit_exceeded: statsResult?.rate_limit_count || 0,
        suspicious_pattern: statsResult?.suspicious_count || 0
      }
    };

    // Get recent events (last 10)
    const eventsResult = await env.DB.prepare(`
      SELECT event_type, details, created_at
      FROM security_events
      WHERE ip_address = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(ip).all();

    const recentEvents = (eventsResult.results || []).map((row: any) => {
      let endpoint = '';
      try {
        if (row.details) {
          const parsedDetails = JSON.parse(row.details);
          endpoint = parsedDetails.endpoint || '';
        }
      } catch (e) {
        // Invalid JSON, use empty string
      }

      return {
        event_type: row.event_type,
        endpoint,
        created_at: new Date(row.created_at).toISOString()
      };
    });

    return jsonResponse(
      {
        ip: anonymizeIP(ip),
        is_blocked: isBlocked,
        block_info: blockData,
        statistics,
        recent_events: recentEvents
      },
      200,
      request
    );
  } catch (error) {
    console.error('Error getting IP detail:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle GET /api/admin/security/export
 *
 * BDD Scenarios:
 * - Scenario 1: Success - Export all events as CSV
 * - Scenario 2: Success - Export with filters
 * - Scenario 3: Success - Limit to 1000 rows
 * - Scenario 4: 401 - Unauthorized
 */
export async function handleSecurityExport(request: Request, env: Env): Promise<Response> {
  try {
    // Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      return adminErrorResponse('Authentication required', 401, request);
    }

    // Parse query parameters (same as handleSecurityEvents)
    const url = new URL(request.url);
    const eventType = url.searchParams.get('event_type');
    const startTime = url.searchParams.get('start_time');
    const endTime = url.searchParams.get('end_time');

    // Build WHERE clause
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (eventType) {
      conditions.push('event_type = ?');
      bindings.push(eventType);
    }

    if (startTime) {
      conditions.push('created_at >= ?');
      bindings.push(new Date(startTime).toISOString());
    }

    if (endTime) {
      conditions.push('created_at <= ?');
      bindings.push(new Date(endTime).toISOString());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query events with limit of 1000
    const query = `
      SELECT id, event_type, ip_address as ip, details, created_at
      FROM security_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 1000
    `;

    const result = await env.DB.prepare(query).bind(...bindings).all();

    // Build CSV
    const csvRows: string[] = [];
    csvRows.push('id,event_type,ip,endpoint,user_agent,created_at');

    for (const row of result.results || []) {
      const rowData: any = row;
      let userAgent = '';
      let endpoint = '';

      try {
        if (rowData.details) {
          const parsedDetails = JSON.parse(rowData.details);
          userAgent = parsedDetails.user_agent || '';
          endpoint = parsedDetails.endpoint || '';
        }
      } catch (e) {
        // Invalid JSON, use empty strings
      }

      // Escape CSV values
      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csvRow = [
        rowData.id,
        escapeCSV(rowData.event_type),
        escapeCSV(anonymizeIP(rowData.ip)),
        escapeCSV(endpoint),
        escapeCSV(userAgent),
        new Date(rowData.created_at).toISOString()
      ].join(',');

      csvRows.push(csvRow);
    }

    const csv = csvRows.join('\n');

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="security-events.csv"'
      }
    });
  } catch (error) {
    console.error('Error exporting security events:', error);
    return adminErrorResponse('Internal server error', 500, request);
  }
}

/**
 * Handle GET /api/admin/cdn-health
 * Check health of critical CDN resources
 */
export async function handleCDNHealth(request: Request, env: Env): Promise<Response> {
  const isAuthorized = await verifySetupToken(request, env);
  if (!isAuthorized) {
    return adminErrorResponse('Authentication required', 401, request);
  }

  const cdns = [
    { name: 'Three.js r128', url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js' },
    { name: 'QRious 4.0.2', url: 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js' },
    { name: 'DOMPurify 3.2.7', url: 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.7/purify.min.js' },
    { name: 'Lucide 0.562.0', url: 'https://unpkg.com/lucide@0.562.0/dist/umd/lucide.min.js' }
  ];

  const results = await Promise.all(cdns.map(async (cdn) => {
    const start = Date.now();
    try {
      const response = await fetch(cdn.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      const responseTime = Date.now() - start;
      return {
        name: cdn.name,
        url: cdn.url,
        status: response.ok ? 'healthy' : 'failed',
        statusCode: response.status,
        responseTime
      };
    } catch (error) {
      return {
        name: cdn.name,
        url: cdn.url,
        status: 'failed',
        statusCode: 0,
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }));

  return jsonResponse({ cdns: results, timestamp: Date.now() }, 200, request);
}
