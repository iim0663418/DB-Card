// Envelope Encryption Implementation
// Based on ADR-002: Each card has its own DEK, wrapped by KEK

import type { Env } from '../types';

export class EnvelopeEncryption {
  private kek: CryptoKey | null = null;

  async initialize(env: Env): Promise<void> {
    const kekBytes = Uint8Array.from(atob(env.KEK), c => c.charCodeAt(0));
    this.kek = await crypto.subtle.importKey(
      'raw',
      kekBytes,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  async encryptCard(cardData: object): Promise<{ encrypted_payload: string; wrapped_dek: string }> {
    if (!this.kek) throw new Error('KEK not initialized');

    // 1. Generate random DEK (256-bit)
    const dekKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    ) as CryptoKey;

    // 2. Encrypt card data with DEK
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(cardData));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dekKey,
      dataBytes
    );

    // 3. Wrap DEK with KEK
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));
    const dekRaw = await crypto.subtle.exportKey('raw', dekKey) as ArrayBuffer;
    const wrappedDek = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: wrapIv },
      this.kek,
      dekRaw
    );

    // 4. Combine IV + encrypted data, wrapIv + wrapped DEK
    const payload = new Uint8Array(iv.length + encryptedData.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(encryptedData), iv.length);

    const wrappedDekWithIv = new Uint8Array(wrapIv.length + wrappedDek.byteLength);
    wrappedDekWithIv.set(wrapIv, 0);
    wrappedDekWithIv.set(new Uint8Array(wrappedDek), wrapIv.length);

    return {
      encrypted_payload: btoa(String.fromCharCode(...payload)),
      wrapped_dek: btoa(String.fromCharCode(...wrappedDekWithIv))
    };
  }

  async decryptCard(encrypted_payload: string, wrapped_dek: string): Promise<object> {
    if (!this.kek) throw new Error('KEK not initialized');

    // 1. Decode base64
    const payloadBytes = Uint8Array.from(atob(encrypted_payload), c => c.charCodeAt(0));
    const wrappedDekBytes = Uint8Array.from(atob(wrapped_dek), c => c.charCodeAt(0));

    // 2. Extract IVs
    const iv = payloadBytes.slice(0, 12);
    const encryptedData = payloadBytes.slice(12);
    const wrapIv = wrappedDekBytes.slice(0, 12);
    const wrappedDekData = wrappedDekBytes.slice(12);

    // 3. Unwrap DEK with KEK
    const dekBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapIv },
      this.kek,
      wrappedDekData
    );

    const dek = await crypto.subtle.importKey(
      'raw',
      dekBytes,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // 4. Decrypt card data with DEK
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      encryptedData
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }

  /**
   * Unwrap (decrypt) a DEK using the KEK
   * Used for KEK rotation to extract the raw DEK
   *
   * @param wrapped_dek - Base64-encoded wrapped DEK (IV + encrypted DEK)
   * @param kek - The KEK to use for unwrapping (can be different from this.kek)
   * @returns Base64-encoded raw DEK (32 bytes for AES-256)
   */
  async unwrapDek(wrapped_dek: string, kek: CryptoKey): Promise<string> {
    // 1. Decode base64 wrapped DEK
    const wrappedDekBytes = Uint8Array.from(atob(wrapped_dek), c => c.charCodeAt(0));

    // 2. Extract IV and wrapped DEK data
    const wrapIv = wrappedDekBytes.slice(0, 12);
    const wrappedDekData = wrappedDekBytes.slice(12);

    // 3. Unwrap DEK with KEK
    const dekBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: wrapIv },
      kek,
      wrappedDekData
    );

    // 4. Return base64-encoded raw DEK
    return btoa(String.fromCharCode(...new Uint8Array(dekBytes)));
  }

  /**
   * Wrap (encrypt) a DEK using the KEK
   * Used for KEK rotation to re-wrap the DEK with a new KEK
   *
   * @param dek - Base64-encoded raw DEK (32 bytes for AES-256)
   * @param kek - The KEK to use for wrapping (can be different from this.kek)
   * @returns Base64-encoded wrapped DEK (IV + encrypted DEK)
   */
  async wrapDek(dek: string, kek: CryptoKey): Promise<string> {
    // 1. Decode base64 DEK
    const dekBytes = Uint8Array.from(atob(dek), c => c.charCodeAt(0));

    // 2. Generate random IV for wrapping
    const wrapIv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Wrap DEK with KEK
    const wrappedDek = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: wrapIv },
      kek,
      dekBytes
    );

    // 4. Combine IV + wrapped DEK
    const wrappedDekWithIv = new Uint8Array(wrapIv.length + wrappedDek.byteLength);
    wrappedDekWithIv.set(wrapIv, 0);
    wrappedDekWithIv.set(new Uint8Array(wrappedDek), wrapIv.length);

    // 5. Return base64-encoded wrapped DEK
    return btoa(String.fromCharCode(...wrappedDekWithIv));
  }
}
