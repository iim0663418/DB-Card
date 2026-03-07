import type { Env } from '../types';
import { calculateStringSimilarity, checkPersonIdentity, checkCompanyRelationship } from '../cron/deduplicate-cards';

/**
 * Generate canonicalized pair key (direction-independent)
 */
export function generatePairKey(uuid1: string, uuid2: string): string {
  return [uuid1, uuid2].sort().join(':');
}

/**
 * Check if a pair is blacklisted
 */
export async function isBlacklisted(
  env: Env,
  uuid1: string,
  uuid2: string
): Promise<boolean> {
  const pairKey = generatePairKey(uuid1, uuid2);
  const now = Date.now();
  
  const result = await env.DB.prepare(`
    SELECT 1 FROM matching_blacklist
    WHERE person_pair_key = ?
      AND (expires_at IS NULL OR expires_at > ?)
    LIMIT 1
  `).bind(pairKey, now).first();
  
  return !!result;
}

/**
 * Normalize phone number
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s+()]/g, '');
}

/**
 * Unified identity resolution
 * Integrates with existing deduplicate-cards.ts logic
 */
export async function resolveIdentity(
  env: Env,
  cardA: any,
  cardB: any
): Promise<{
  isSamePerson: boolean;
  confidence: number;
  method: string;
  evidence: Record<string, any>;
}> {
  
  // 1. Email exact match (highest priority)
  if (cardA.email && cardA.email === cardB.email) {
    return {
      isSamePerson: true,
      confidence: 1.00,
      method: 'email_exact',
      evidence: { email_match: true, email: cardA.email }
    };
  }
  
  // 2. Phone exact match
  if (cardA.phone && cardB.phone) {
    const phoneA = normalizePhone(cardA.phone);
    const phoneB = normalizePhone(cardB.phone);
    if (phoneA === phoneB) {
      return {
        isSamePerson: true,
        confidence: 0.95,
        method: 'phone_exact',
        evidence: { phone_match: true, phone_normalized: phoneA }
      };
    }
  }
  
  // 3. String similarity + FileSearchStore context
  const stringSim = calculateStringSimilarity(cardA, cardB);
  
  if (stringSim.score >= 50 && stringSim.score <= 90) {
    // Gray zone: use FileSearchStore enhancement
    const personResult = await checkPersonIdentity(env, cardA, cardB);
    const companyResult = await checkCompanyRelationship(
      env,
      cardA.organization || '',
      cardB.organization || ''
    );
    
    if (personResult.isSamePerson && companyResult.isSameCompany) {
      return {
        isSamePerson: true,
        confidence: Math.max(0.95, personResult.confidence / 100),
        method: 'context_match',
        evidence: {
          string_similarity: stringSim.score,
          person_match: personResult.reason,
          company_match: companyResult.reason,
          person_confidence: personResult.confidence
        }
      };
    }
    
    if (personResult.isSamePerson && personResult.confidence > 85) {
      return {
        isSamePerson: true,
        confidence: personResult.confidence / 100,
        method: 'context_match',
        evidence: {
          string_similarity: stringSim.score,
          person_match: personResult.reason,
          person_confidence: personResult.confidence
        }
      };
    }
  }
  
  return {
    isSamePerson: false,
    confidence: stringSim.score / 100,
    method: 'string_similarity',
    evidence: { string_similarity: stringSim.score }
  };
}
