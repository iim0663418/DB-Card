// Admin KEK Status Handler
// GET /api/admin/kek/status - Monitor KEK status

import type { Env } from '../../types';
import { verifySetupToken } from '../../middleware/auth';
import { jsonResponse, adminErrorResponse } from '../../utils/response';

/**
 * KEK Status Response
 */
interface KekStatusResponse {
  current_version: number;
  activated_at: string; // ISO 8601
  days_active: number;
  status: 'normal' | 'reminder' | 'warning' | 'urgent';
  recommendation: {
    rotation_cycle_days: number;
    days_until_recommended: number;
    should_rotate: boolean;
  };
}

/**
 * Calculate KEK status level based on days active
 * - 0-60 days: normal
 * - 61-90 days: reminder
 * - 91-120 days: warning
 * - 120+ days: urgent
 */
function calculateStatus(daysActive: number): 'normal' | 'reminder' | 'warning' | 'urgent' {
  if (daysActive >= 120) return 'urgent';
  if (daysActive >= 91) return 'warning';
  if (daysActive >= 61) return 'reminder';
  return 'normal';
}

/**
 * Handle GET /api/admin/kek/status
 *
 * BDD Scenarios:
 * - Scenario 1: Get KEK status with version, activated time, days active
 * - Scenario 2: Calculate status level (normal/reminder/warning/urgent)
 * - Scenario 3: Provide rotation recommendation
 * - Scenario 4: 401 - Unauthorized (missing Authorization header)
 */
export async function handleKekStatus(request: Request, env: Env): Promise<Response> {
  try {
    // Scenario 4: Verify authorization
    const isAuthorized = await verifySetupToken(request, env);

    if (!isAuthorized) {
      const authHeader = request.headers.get('Authorization');

      if (!authHeader) {
        return adminErrorResponse('Authentication required', 401, request);
      } else {
        return adminErrorResponse('Invalid token', 403, request);
      }
    }

    // Scenario 1: Get current active KEK version
    const currentVersionResult = await env.DB.prepare(`
      SELECT version, created_at FROM kek_versions
      WHERE status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `).first<{ version: number; created_at: number }>();

    if (!currentVersionResult) {
      return adminErrorResponse('No active KEK version found', 404, request);
    }

    const { version, created_at } = currentVersionResult;
    const activatedAt = new Date(created_at);
    const now = new Date();

    // Scenario 1: Calculate days active
    const daysActive = Math.floor((now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24));

    // Scenario 2: Calculate status level
    const status = calculateStatus(daysActive);

    // Scenario 3: Calculate rotation recommendation
    const rotationCycleDays = 90;
    const daysUntilRecommended = rotationCycleDays - daysActive;
    const shouldRotate = daysActive >= rotationCycleDays;

    const response: KekStatusResponse = {
      current_version: version,
      activated_at: activatedAt.toISOString(),
      days_active: daysActive,
      status,
      recommendation: {
        rotation_cycle_days: rotationCycleDays,
        days_until_recommended: daysUntilRecommended,
        should_rotate: shouldRotate
      }
    };

    return jsonResponse(response, 200, request);
  } catch (error) {
    console.error('Error getting KEK status:', error);
    return adminErrorResponse('Failed to get KEK status', 500, request);
  }
}
