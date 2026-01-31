// Twin Status Management
// Implements BDD spec: .specify/specs/twin-status-management.md

import type { Env, Asset } from '../types';

export type TwinStatus = 'ready' | 'stale' | 'disabled';

interface Card {
  uuid: string;
  status: string;
  encrypted_payload: string;
}

interface TwinStatusRecord {
  card_uuid: string;
  enabled: boolean;
  status: TwinStatus;
  last_rebuild_at: string;
  error_message: string | null;
}

/**
 * Check if twin can be enabled
 * BDD Scenario 4: Verify at least one core asset exists
 * Note: Card data validation is deferred - we assume cards table has valid encrypted data
 */
export function canEnableTwin(card: Card, assets: Asset[]): boolean {
  // Card must exist and be active
  if (!card || card.status !== 'active') return false;

  // At least one core asset check
  const coreAssets = assets.filter(a =>
    ['avatar', 'twin_front', 'twin_back'].includes(a.asset_type) &&
    a.status === 'ready'
  );

  return coreAssets.length > 0;
}

/**
 * Update twin status in database
 */
export async function updateTwinStatus(
  env: Env,
  cardUuid: string,
  enabled: boolean,
  status: TwinStatus,
  errorMessage?: string
): Promise<void> {
  const now = new Date().toISOString();

  // Upsert twin_status record
  await env.DB.prepare(`
    INSERT INTO twin_status (card_uuid, enabled, status, last_rebuild_at, error_message)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(card_uuid) DO UPDATE SET
      enabled = excluded.enabled,
      status = excluded.status,
      last_rebuild_at = excluded.last_rebuild_at,
      error_message = excluded.error_message
  `).bind(cardUuid, enabled ? 1 : 0, status, now, errorMessage || null).run();
}

/**
 * Auto-enable twin on upload
 * BDD Scenario 1: First upload auto-enables if conditions met
 */
export async function autoEnableOnUpload(
  env: Env,
  cardUuid: string
): Promise<void> {
  // Fetch card data (cards table doesn't have status, get from uuid_bindings)
  const card = await env.DB.prepare(
    'SELECT uuid, encrypted_payload FROM cards WHERE uuid = ?'
  ).bind(cardUuid).first<Card>();

  if (!card) return;

  // Fetch all ready assets
  const assetsResult = await env.DB.prepare(
    'SELECT asset_id, card_uuid, asset_type, status FROM assets WHERE card_uuid = ? AND status = ?'
  ).bind(cardUuid, 'ready').all<Asset>();

  const assets = assetsResult.results || [];

  // Check if can enable
  if (canEnableTwin(card, assets)) {
    await updateTwinStatus(env, cardUuid, true, 'ready');
  }
}

/**
 * Mark twin as stale on update
 * BDD Scenario 2: Update marks status as stale
 */
export async function markStaleOnUpdate(
  env: Env,
  cardUuid: string
): Promise<void> {
  // Check if twin is currently enabled
  const twinStatus = await env.DB.prepare(
    'SELECT enabled, status FROM twin_status WHERE card_uuid = ?'
  ).bind(cardUuid).first<{ enabled: number; status: TwinStatus }>();

  if (twinStatus && twinStatus.enabled && twinStatus.status === 'ready') {
    await updateTwinStatus(env, cardUuid, true, 'stale');
  }
}

/**
 * Disable twin on asset delete
 * BDD Scenario 3: Delete asset disables twin if no core assets remain
 */
export async function disableOnDelete(
  env: Env,
  cardUuid: string
): Promise<void> {
  // Fetch card data (cards table doesn't have status)
  const card = await env.DB.prepare(
    'SELECT uuid, encrypted_payload FROM cards WHERE uuid = ?'
  ).bind(cardUuid).first<Card>();

  if (!card) return;

  // Fetch remaining ready assets
  const assetsResult = await env.DB.prepare(
    'SELECT asset_id, card_uuid, asset_type, status FROM assets WHERE card_uuid = ? AND status = ?'
  ).bind(cardUuid, 'ready').all<Asset>();

  const assets = assetsResult.results || [];

  // Check if can still enable
  if (!canEnableTwin(card, assets)) {
    await updateTwinStatus(env, cardUuid, false, 'disabled');
  }
}
