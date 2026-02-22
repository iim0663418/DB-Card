// vCard Export Handler
// GET /api/user/received-cards/:uuid/vcard - Export card as vCard 3.0

import type { Env } from '../../../types';
import { verifyOAuth } from '../../../middleware/oauth';
import { errorResponse } from '../../../utils/response';

/**
 * ReceivedCard interface matching database schema
 */
interface ReceivedCard {
  uuid: string;
  user_email: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  title?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  note?: string | null;
  created_at: string;
  updated_at?: string | null;
}

/**
 * Escape special characters for vCard 3.0 (RFC 2426)
 *
 * Escaping rules:
 * - Backslash (\) → Double backslash (\\)
 * - Comma (,) → Escaped comma (\,)
 * - Semicolon (;) → Escaped semicolon (\;)
 * - Newline (\n or \r\n) → Escaped newline literal (\n)
 */
function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')    // \ → \\
    .replace(/,/g, '\\,')      // , → \,
    .replace(/;/g, '\\;')      // ; → \;
    .replace(/\r\n/g, '\\n')   // CRLF → \n
    .replace(/\n/g, '\\n');    // LF → \n
}

/**
 * Generate N field (structured name) for vCard
 * Format: last_name;first_name;;;
 *
 * If first_name and last_name are available, use them.
 * Otherwise, use full_name as last_name (common for CJK names).
 */
function generateNameField(card: ReceivedCard): string {
  if (card.last_name && card.first_name) {
    return `${escapeVCardValue(card.last_name)};${escapeVCardValue(card.first_name)};;;`;
  }
  // Fallback: use full_name as last_name
  return `${escapeVCardValue(card.full_name)};;;;`;
}

/**
 * Sanitize filename by removing special characters
 * Prevents file system issues on various platforms
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

/**
 * Generate vCard 3.0 string from ReceivedCard
 * Compliant with RFC 2426
 *
 * @param card ReceivedCard object
 * @returns vCard 3.0 formatted string with CRLF line endings
 */
export function generateVCard(card: ReceivedCard): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(card.full_name)}`,
    `N:${generateNameField(card)}`
  ];

  // Optional fields - only include if present
  if (card.organization) {
    lines.push(`ORG:${escapeVCardValue(card.organization)}`);
  }

  if (card.title) {
    lines.push(`TITLE:${escapeVCardValue(card.title)}`);
  }

  if (card.phone) {
    lines.push(`TEL;TYPE=CELL:${card.phone}`);
  }

  if (card.email) {
    lines.push(`EMAIL:${card.email}`);
  }

  if (card.website) {
    lines.push(`URL:${card.website}`);
  }

  if (card.address) {
    // ADR format: ;;street address;;;;
    lines.push(`ADR:;;${escapeVCardValue(card.address)};;;;`);
  }

  if (card.note) {
    lines.push(`NOTE:${escapeVCardValue(card.note)}`);
  }

  lines.push('END:VCARD');

  // Join with CRLF as per RFC 2426
  return lines.join('\r\n');
}

/**
 * Handle GET /api/user/received-cards/:uuid/vcard
 *
 * Exports a received card as vCard 3.0 format
 * Enforces tenant isolation (user can only access their own cards)
 *
 * @param request HTTP request
 * @param env Environment bindings
 * @param uuid Card UUID
 * @returns Response with vCard file or error
 */
export async function handleGetVCard(
  request: Request,
  env: Env,
  uuid: string
): Promise<Response> {
  try {
    // OAuth verification (tenant isolation)
    const userResult = await verifyOAuth(request, env);
    if (userResult instanceof Response) {
      return userResult;
    }
    const user = userResult;

    // Query card with tenant isolation
    const card = await env.DB.prepare(`
      SELECT
        uuid, user_email, full_name, first_name, last_name,
        organization, title, phone, email, website, address, note,
        created_at, updated_at
      FROM received_cards
      WHERE uuid = ? AND user_email = ? AND deleted_at IS NULL
    `).bind(uuid, user.email).first<ReceivedCard>();

    if (!card) {
      // Return 404 without revealing card existence (tenant isolation)
      return errorResponse('CARD_NOT_FOUND', 'Card not found or not authorized', 404);
    }

    // Generate vCard
    const vcardString = generateVCard(card);

    // UTF-8 with BOM for better compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const vcardBytes = new TextEncoder().encode(vcardString);
    const vcardWithBom = new Uint8Array(bom.length + vcardBytes.length);
    vcardWithBom.set(bom, 0);
    vcardWithBom.set(vcardBytes, bom.length);

    // Sanitize filename and encode for UTF-8
    const safeFilename = card.full_name.replace(/[<>:"/\\|?*]/g, '_');
    const encodedFilename = encodeURIComponent(safeFilename);

    // Return vCard file with RFC 5987 encoded filename
    return new Response(vcardWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}.vcf"; filename*=UTF-8''${encodedFilename}.vcf`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('vCard export error:', error);
    return errorResponse('VCARD_EXPORT_FAILED', 'Failed to export vCard', 500);
  }
}
