/**
 * Tag Extraction Utilities
 *
 * Organization-based keyword tagging removed (2026-06-23):
 * Keyword matching was too imprecise. AI auto-tagging (Gemini) via
 * auto-tag-cards cron provides accurate industry/location/seniority/expertise.
 */

/**
 * @deprecated No-op. Kept for backward compatibility with callers.
 */
export function extractTagsFromOrganization(_organization: string | null | undefined): string[] {
  return [];
}
