#!/usr/bin/env node
/**
 * KEK Rotation Script - Rewrap all DEKs
 *
 * This script connects to D1, reads all cards, unwraps DEKs with OLD_KEK,
 * and rewraps them with the new KEK.
 *
 * Usage:
 *   npm run kek:rewrap
 *
 * Environment Variables Required:
 *   - KEK: New KEK (base64)
 *   - OLD_KEK: Old KEK (base64) - optional, defaults to KEK
 */

import { webcrypto } from 'node:crypto';

const crypto = webcrypto as unknown as Crypto;

interface Card {
  uuid: string;
  wrapped_dek: string;
}

interface KekVersion {
  version: number;
}

/**
 * Import KEK from base64 string
 */
async function importKek(kekBase64: string): Promise<CryptoKey> {
  const kekBytes = Uint8Array.from(Buffer.from(kekBase64, 'base64'));
  return await crypto.subtle.importKey(
    'raw',
    kekBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Unwrap DEK using KEK
 */
async function unwrapDek(wrappedDek: string, kek: CryptoKey): Promise<string> {
  const wrappedDekBytes = Uint8Array.from(Buffer.from(wrappedDek, 'base64'));
  const wrapIv = wrappedDekBytes.slice(0, 12);
  const wrappedDekData = wrappedDekBytes.slice(12);

  const dekBytes = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapIv },
    kek,
    wrappedDekData
  );

  return Buffer.from(dekBytes).toString('base64');
}

/**
 * Wrap DEK using KEK
 */
async function wrapDek(dek: string, kek: CryptoKey): Promise<string> {
  const dekBytes = Uint8Array.from(Buffer.from(dek, 'base64'));
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));

  const wrappedDek = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv },
    kek,
    dekBytes
  );

  const wrappedDekWithIv = new Uint8Array(wrapIv.length + wrappedDek.byteLength);
  wrappedDekWithIv.set(wrapIv, 0);
  wrappedDekWithIv.set(new Uint8Array(wrappedDek), wrapIv.length);

  return Buffer.from(wrappedDekWithIv).toString('base64');
}

/**
 * Execute wrangler d1 execute command
 */
async function executeD1(sql: string, params: (string | number)[] = []): Promise<any> {
  const { execSync } = await import('node:child_process');

  // Escape SQL parameters
  let query = sql;
  params.forEach(param => {
    const escaped = typeof param === 'string'
      ? `'${param.replace(/'/g, "''")}'`
      : param;
    query = query.replace('?', escaped.toString());
  });

  const cmd = `wrangler d1 execute DB --remote --command="${query.replace(/"/g, '\\"')}"`;
  const output = execSync(cmd, { encoding: 'utf-8' });

  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

/**
 * Query D1 database
 */
async function queryD1<T>(sql: string): Promise<T[]> {
  const { execSync } = await import('node:child_process');

  const cmd = `wrangler d1 execute DB --remote --command="${sql.replace(/"/g, '\\"')}" --json`;
  const output = execSync(cmd, { encoding: 'utf-8' });

  const result = JSON.parse(output);
  return result[0]?.results || [];
}

/**
 * Main rewrap function
 */
async function rewrapDeks() {
  console.log('🔄 Starting KEK rotation...\n');

  // Check environment variables
  const newKekBase64 = process.env.KEK;
  const oldKekBase64 = process.env.OLD_KEK || newKekBase64;

  if (!newKekBase64) {
    console.error('❌ Error: KEK environment variable not set');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   - OLD_KEK: ${oldKekBase64 ? '✓ Set' : '✗ Not set (using KEK)'}`);
  console.log(`   - KEK: ✓ Set\n`);

  try {
    // Import KEKs
    console.log('🔑 Importing KEKs...');
    const oldKek = await importKek(oldKekBase64);
    const newKek = await importKek(newKekBase64);
    console.log('   ✓ KEKs imported\n');

    // Get current KEK version
    console.log('📊 Querying current KEK version...');
    const versionResult = await queryD1<KekVersion>(`
      SELECT version FROM kek_versions
      WHERE status = 'active'
      ORDER BY version DESC
      LIMIT 1
    `);

    const oldVersion = versionResult[0]?.version || 1;
    const newVersion = oldVersion + 1;
    console.log(`   - Old version: ${oldVersion}`);
    console.log(`   - New version: ${newVersion}\n`);

    // Insert new KEK version
    console.log('💾 Updating KEK versions...');
    const rotatedAt = Date.now();

    await executeD1(`
      INSERT INTO kek_versions (version, status, created_at)
      VALUES (?, 'active', ?)
    `, [newVersion, rotatedAt]);

    // Update old version to inactive
    if (versionResult.length > 0) {
      await executeD1(`
        UPDATE kek_versions
        SET status = 'inactive'
        WHERE version = ?
      `, [oldVersion]);
    }
    console.log('   ✓ KEK versions updated\n');

    // Query all active cards
    console.log('🃏 Querying active cards...');
    const cards = await queryD1<Card>(`
      SELECT uuid, wrapped_dek
      FROM cards
      WHERE status = 'active'
    `);
    console.log(`   - Found ${cards.length} cards\n`);

    if (cards.length === 0) {
      console.log('✅ No cards to rewrap. KEK rotation complete.\n');
      return;
    }

    // Rewrap each card
    console.log('🔄 Rewrapping cards...');
    let cardsRewrapped = 0;
    let cardsFailed = 0;

    for (const card of cards) {
      try {
        // Unwrap DEK with old KEK
        const dek = await unwrapDek(card.wrapped_dek, oldKek);

        // Wrap DEK with new KEK
        const newWrappedDek = await wrapDek(dek, newKek);

        // Update card
        await executeD1(`
          UPDATE cards
          SET wrapped_dek = ?,
              key_version = ?,
              updated_at = ?
          WHERE uuid = ?
        `, [newWrappedDek, newVersion, rotatedAt, card.uuid]);

        cardsRewrapped++;
        process.stdout.write(`\r   - Progress: ${cardsRewrapped}/${cards.length}`);
      } catch (error) {
        cardsFailed++;
        console.error(`\n   ⚠️  Failed to rewrap card ${card.uuid}:`, error);
      }
    }

    console.log('\n');

    // Summary
    console.log('✅ KEK rotation complete!\n');
    console.log('📈 Summary:');
    console.log(`   - Old version: ${oldVersion}`);
    console.log(`   - New version: ${newVersion}`);
    console.log(`   - Cards rewrapped: ${cardsRewrapped}`);
    console.log(`   - Cards failed: ${cardsFailed}`);
    console.log(`   - Rotated at: ${new Date(rotatedAt).toISOString()}\n`);

  } catch (error) {
    console.error('\n❌ Error during KEK rotation:', error);
    process.exit(1);
  }
}

// Run the script
rewrapDeks();
