/**
 * Tag Extraction Utilities
 *
 * BDD Spec: Tag Extraction Logic
 * Automatically extracts tags from business card data based on organization field
 */

/**
 * Company type keywords for tag extraction
 * Each type maps to an array of keywords to match
 */
const COMPANY_TYPE_KEYWORDS = {
  government: ['政府', '部會', '機關', '局', '署', '處'],
  listed: ['股份有限公司', '有限公司', 'Co., Ltd.', 'Inc.'],
  startup: ['新創', '創業', 'Startup'],
  ngo: ['基金會', '協會', '學會', '公會']
};

/**
 * Extract tags from organization field
 *
 * @param organization - The organization field from business card
 * @returns Array of matched tags
 *
 * @example
 * extractTagsFromOrganization("數位發展部") // ["government"]
 * extractTagsFromOrganization("台積電股份有限公司") // ["listed"]
 * extractTagsFromOrganization("AI 新創科技") // ["startup"]
 * extractTagsFromOrganization("台灣人工智慧協會") // ["ngo"]
 * extractTagsFromOrganization(null) // []
 */
export function extractTagsFromOrganization(organization: string | null | undefined): string[] {
  // Handle null, undefined, or empty string
  if (!organization) {
    return [];
  }

  const tags = new Set<string>();
  const lowerOrg = organization.toLowerCase();

  // Iterate through each company type and its keywords
  for (const [type, keywords] of Object.entries(COMPANY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerOrg.includes(keyword.toLowerCase())) {
        tags.add(type);
        break; // Each type should only be added once
      }
    }
  }

  return Array.from(tags);
}
