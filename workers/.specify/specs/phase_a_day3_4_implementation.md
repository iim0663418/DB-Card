# Phase A Day 3-4: Identity Resolution Implementation

## Objective
Implement identity resolution functions that integrate with existing deduplication logic to determine if two cards from different users represent the same person.

## Files to Create

### 1. workers/src/utils/identity-resolution.ts

Create a new file with the following functions:

#### Function 1: generatePairKey()
```typescript
/**
 * Generate canonicalized pair key (direction-independent)
 * Example: generatePairKey('uuid-b', 'uuid-a') === generatePairKey('uuid-a', 'uuid-b')
 */
export function generatePairKey(uuid1: string, uuid2: string): string {
  return [uuid1, uuid2].sort().join(':');
}
```

#### Function 2: isBlacklisted()
```typescript
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
```

#### Function 3: normalizePhone()
```typescript
/**
 * Normalize phone number (remove all non-digits)
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[-\s+()]/g, '');
}
```

#### Function 4: resolveIdentity()
```typescript
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
  // Import existing dedup logic
  const { calculateStringSimilarity } = await import('../cron/deduplicate-cards');
  const stringSim = calculateStringSimilarity(cardA, cardB);
  
  if (stringSim.score >= 50 && stringSim.score <= 90) {
    // Gray zone: use FileSearchStore enhancement
    const { checkPersonIdentity, checkCompanyRelationship } = await import('../cron/deduplicate-cards');
    
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
```

## Import Statement
Add this import at the top of the file:
```typescript
import type { Env } from '../types';
```

## Acceptance Criteria
- [ ] File `src/utils/identity-resolution.ts` created
- [ ] All 4 functions implemented
- [ ] TypeScript compiles with zero errors
- [ ] Functions integrate with existing dedup logic
- [ ] Pair key is canonicalized (direction-independent)

## Testing
After implementation:
1. Run `npm run typecheck` - should pass
2. Test `generatePairKey('a', 'b')` === `generatePairKey('b', 'a')`
3. Verify imports from `deduplicate-cards.ts` work correctly
