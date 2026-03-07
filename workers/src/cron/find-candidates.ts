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
  
  const stmt = env.DB.prepare(`
    SELECT 
      uuid,
      user_email,
      full_name,
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
  
  const usersStmt = env.DB.prepare(`
    SELECT DISTINCT user_email
    FROM received_cards
    WHERE merged_to IS NULL
  `);
  const { results: users } = await usersStmt.all();
  
  console.log(`[Cron] Found ${users.length} users with active cards`);
  
  for (const user of users) {
    const userEmail = (user as any).user_email;
    
    const cardsStmt = env.DB.prepare(`
      SELECT 
        uuid,
        full_name,
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
    
    for (const card of cards) {
      processed++;
      
      const potentialMatches = await findPotentialMatches(env, card, userEmail);
      
      for (const match of potentialMatches) {
        const cardA = card as any;
        const cardB = match.card;
        
        const isBlacklistedPair = await isBlacklisted(env, cardA.uuid, cardB.uuid);
        if (isBlacklistedPair) {
          blacklisted++;
          continue;
        }
        
        const result = await resolveIdentity(env, cardA, cardB);
        
        if (result.isSamePerson && result.confidence >= 0.85) {
          const pairKey = generatePairKey(cardA.uuid, cardB.uuid);
          const confidence = Math.round(result.confidence * 100);
          
          await env.DB.prepare(`
            INSERT INTO cross_user_match_candidates (
              person_pair_key,
              card_a_uuid,
              card_a_user,
              card_b_uuid,
              card_b_user,
              match_confidence,
              match_method,
              match_evidence,
              validation_status,
              detected_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            ON CONFLICT(person_pair_key) DO NOTHING
          `).bind(
            pairKey,
            cardA.uuid,
            userEmail,
            cardB.uuid,
            match.userEmail,
            confidence,
            result.method,
            JSON.stringify(result.evidence),
            Date.now()
          ).run();
          
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
