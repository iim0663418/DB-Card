// Dynamic Manifest Handler
// Generates PWA manifest for QR Code quick shortcut

import type { Env } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleManifest(request: Request, env: Env, uuid: string): Promise<Response> {
  // Validate UUID format (RFC 4122)
  if (!uuid || !UUID_REGEX.test(uuid)) {
    return new Response(
      JSON.stringify({ error: 'invalid_uuid', message: 'Invalid UUID format' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Get custom name and type from URL parameters
  const url = new URL(request.url);
  const customName = url.searchParams.get('name');
  const cardType = url.searchParams.get('type') || 'personal';
  
  // Add type suffix for non-personal cards
  const typeSuffix = cardType === 'personal' ? '' : 
                     cardType === 'event' ? '（活動）' : 
                     cardType === 'sensitive' ? '（敏感）' : '';
  
  // Generate personalized app name with type suffix
  const appName = customName 
    ? (cardType === 'personal' ? `${customName}的名片` : `${customName}的名片${typeSuffix}`)
    : '數位名片 QR';
  
  // Short name for home screen (max 12 chars)
  const shortName = customName 
    ? (customName.length + typeSuffix.length + 3 <= 12 ? `${customName}的名片${typeSuffix}` : `${customName}${typeSuffix}`)
    : '名片 QR';

  const manifest = {
    name: appName,
    short_name: shortName,
    start_url: `/qr-quick.html?uuid=${uuid}`,
    scope: `/qr-quick.html?uuid=${uuid}`,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#6868ac',
    background_color: '#6868ac',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: { 'Content-Type': 'application/manifest+json' }
  });
}
