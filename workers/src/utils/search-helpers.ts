/**
 * Search helper utilities for received-cards search and organization alias handling.
 */

/**
 * Escape special LIKE characters (%, _, \) using backslash as escape char.
 * Use together with `LIKE ? ESCAPE '\'` in SQL queries.
 */
export function escapeLike(term: string): string {
  return term
    .replace(/\\/g, '\\\\') // \ → \\  (must be first to avoid double-escaping)
    .replace(/%/g, '\\%')   // % → \%
    .replace(/_/g, '\\_');  // _ → \_
}

/**
 * Parse organization_alias from DB (JSON array string or legacy CSV) into string[].
 * Returns [] for null/empty input; never throws.
 */
export function parseOrganizationAlias(raw: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Try JSON array first
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s: unknown) => String(s).trim())
          .filter(s => s.length > 0);
      }
    } catch {
      // Fall through to CSV
    }
  }

  // CSV fallback (legacy format: "foo, bar")
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Normalize any organization_alias input to a canonical JSON array string.
 * Accepts: string (JSON array, JSON string, CSV), string[], null/undefined, unknown.
 * Never throws; always returns a valid JSON array string (e.g. '["foo","bar"]' or '[]').
 */
export function normalizeOrganizationAlias(input: unknown): string {
  if (input === null || input === undefined) return '[]';

  if (Array.isArray(input)) {
    const filtered = input
      .map(s => String(s).trim())
      .filter(s => s.length > 0);
    return JSON.stringify(filtered);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '[]';

    // Already a JSON array
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .map((s: unknown) => String(s).trim())
            .filter(s => s.length > 0);
          return JSON.stringify(filtered);
        }
      } catch {
        // Fall through
      }
    }

    // JSON-encoded single string: "foo"
    if (trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string' && parsed.trim()) {
          return JSON.stringify([parsed.trim()]);
        }
      } catch {
        // Fall through
      }
    }

    // CSV or plain string
    const items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    return JSON.stringify(items);
  }

  // Unknown type – log and return empty array
  console.warn('[normalizeOrganizationAlias] unexpected input type:', typeof input, String(input).slice(0, 100));
  return '[]';
}
