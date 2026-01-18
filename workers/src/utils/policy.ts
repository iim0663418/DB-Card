// Card Policy Management Utilities

import type { CardType, CardPolicy } from '../types';
import { CARD_POLICIES } from '../types';

/**
 * Get the policy configuration for a given card type
 */
export function getPolicy(card_type: CardType): CardPolicy {
  const policy = CARD_POLICIES[card_type];
  if (!policy) {
    throw new Error(`Invalid card_type: ${card_type}`);
  }
  return policy;
}

/**
 * Validate that a policy has required fields
 */
export function validatePolicy(policy: CardPolicy): boolean {
  return (
    typeof policy.ttl === 'number' &&
    policy.ttl > 0 &&
    typeof policy.max_reads === 'number' &&
    policy.max_reads > 0 &&
    (policy.scope === 'public' || policy.scope === 'private')
  );
}
