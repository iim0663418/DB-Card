# Phase A Day 5: Cron Job Implementation

## Objective
Implement daily Cron Job to find cross-user candidate matches and record them in the database.

## Files to Create

### 1. workers/src/cron/find-candidates.ts

```typescript
import type { Env } from '../types';
import { resolveIdentity, isBlacklisted, generatePairKey } from '../utils/identity-resolution';

/**
 * Find potential cross-user matches for a given card
 */
async function findPotentialMatches(
  env: Env,
  targetCard: any,
  targetUserEmail: string
): Promise<Array<{ card: any; userEmail: string }>> {
  
  // Query all cards from OTHER users (exclude same user)
  const stmt = env.DB.prepare(`
    SELECT 
      card_uuid,
      user_email,
      name,
      email,
      phone,
      organization,
      title
    FROM received_cards
    WHERE user_email != ?
      AND merged_to IS NULL
    ORDER BY created_at DESC
    LIMIT 1000
  `).bind(targetUserEmail);
  
  const { results } = await stmt.all();
  
  return results.map((row: any) => ({
    card: row,
    userEmail: row.user_email
  }));
}

/**
 * Main Cron Job: Find cross-user candidate matches
 */
export async function findCrossUserCandidates(env: Env): Promise<{
  processed: number;
  candidates: number;
  blacklisted: number;
}> {
  
  console.log('[Cron] Starting cross-user candidate matching...');
  
  let processed = 0;
  let candidates = 0;
  let blacklisted = 0;
  
  // Get all unique users
  const usersStmt = env.DB.prepare(`
    SELECT DISTINCT user_email
    FROM received_cards
    WHERE merged_to IS NULL
  `);
  const { results: users } = await usersStmt.all();
  
  console.log(`[Cron] Found ${users.length} users with active cards`);
  
  // For each user, get their cards
  for (const user of users) {
    const userEmail = (user as any).user_email;
    
    const cardsStmt = env.DB.prepare(`
      SELECT 
        card_uuid,
        name,
        email,
        phone,
        organization,
        title
      FROM received_cards
      WHERE user_email = ?
        AND merged_to IS NULL
      LIMIT 100
    `).bind(userEmail);
    
    const { results: cards } = await cardsStmt.all();
    
    // For each card, find potential matches
    for (const card of cards) {
      processed++;
      
      const potentialMatches = await findPotentialMatches(env, card, userEmail);
      
      for (const match of potentialMatches) {
        const cardA = card as any;
        const cardB = match.card;
        
        // Check blacklist first
        const isBlacklistedPair = await isBlacklisted(env, cardA.card_uuid, cardB.card_uuid);
        if (isBlacklistedPair) {
          blacklisted++;
          continue;
        }
        
        // Resolve identity
        const result = await resolveIdentity(env, cardA, cardB);
        
        if (result.isSamePerson && result.confidence >= 0.85) {
          // Record candidate
          const pairKey = generatePairKey(cardA.card_uuid, cardB.card_uuid);
          const confidence = Math.round(result.confidence * 100);
          
          await env.DB.prepare(`
            INSERT INTO cross_user_match_candidates (
              person_pair_key,
              person_a_uuid,
              person_b_uuid,
              match_confidence,
              match_method,
              match_evidence,
              validation_status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
            ON CONFLICT(person_pair_key) DO NOTHING
          `).bind(
            pairKey,
            cardA.card_uuid,
            cardB.card_uuid,
            confidence,
            result.method,
            JSON.stringify(result.evidence),
            Date.now()
          ).run();
          
          // Add to blacklist to prevent re-processing
          await env.DB.prepare(`
            INSERT INTO matching_blacklist (person_pair_key, created_at)
            VALUES (?, ?)
            ON CONFLICT(person_pair_key) DO NOTHING
          `).bind(pairKey, Date.now()).run();
          
          candidates++;
          console.log(`[Cron] Found candidate: ${cardA.name} <-> ${cardB.name} (${confidence}%)`);
        }
      }
    }
  }
  
  console.log(`[Cron] Completed: processed=${processed}, candidates=${candidates}, blacklisted=${blacklisted}`);
  
  return { processed, candidates, blacklisted };
}
```

## Integration

### 2. Modify workers/src/index.ts

Add Cron trigger:

```typescript
import { findCrossUserCandidates } from './cron/find-candidates';

// In scheduled() handler, add:
case '0 2 * * *': // Daily at 02:00
  console.log('[Cron] Running cross-user candidate matching');
  await findCrossUserCandidates(env);
  break;
```

## Acceptance Criteria
- [ ] File `src/cron/find-candidates.ts` created
- [ ] `findCrossUserCandidates()` implemented
- [ ] `findPotentialMatches()` implemented
- [ ] Integrated into `src/index.ts` Cron triggers
- [ ] TypeScript compiles with zero errors
- [ ] Cron schedule: Daily 02:00

## Testing
After implementation:
1. Run `npm run typecheck` - should pass
2. Manually trigger: `wrangler dev` and call scheduled handler
3. Verify candidates written to database
4. Check blacklist prevents duplicates
