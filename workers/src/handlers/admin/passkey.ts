import type { Env } from '../../types';
import { jsonResponse, errorResponse, getCorsHeaders } from '../../utils/response';
import { validateEmail } from '../../utils/validation';
import { checkLoginRateLimit, incrementLoginAttempts, resetLoginAttempts } from '../../utils/login-rate-limit';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport
} from '@simplewebauthn/server';

// Base64URL encoding/decoding utilities for Cloudflare Workers
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binaryString = atob(paddedBase64);
  return Uint8Array.from(binaryString, char => char.charCodeAt(0));
}

export async function handlePasskeyRegisterStart(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string };
    const { email } = body;

    if (!email) {
      return errorResponse('invalid_request', 'Email required', 400, request);
    }

    const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1')
      .bind(email).first();

    if (!user) {
      return errorResponse('not_found', 'User not found or inactive', 404, request);
    }

    const rpID = env.RP_ID || 'localhost';
    const rpName = 'DB-Card Admin';
    const userID = new TextEncoder().encode(String(user.id)) as ReturnType<Uint8Array['slice']>;

    const opts: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userName: email,
      userID,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    };

    const options = await generateRegistrationOptions(opts);

    await env.KV.put(`passkey_challenge:${email}`, options.challenge, { expirationTtl: 300 });

    // Return options directly without wrapper for SimpleWebAuthn compatibility
    const corsHeaders = request ? getCorsHeaders(request) : {};
    return new Response(JSON.stringify(options), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Passkey register start error:', error);
    return errorResponse('server_error', 'Failed to start registration', 500, request);
  }
}

export async function handlePasskeyRegisterFinish(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { email: string; credential: RegistrationResponseJSON };
    const { email, credential: registrationCredential } = body;

    if (!email || !registrationCredential) {
      return errorResponse('invalid_request', 'Email and credential required', 400, request);
    }

    const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1')
      .bind(email).first() as any;

    if (!user) {
      return errorResponse('not_found', 'User not found or inactive', 404, request);
    }

    const expectedChallenge = await env.KV.get(`passkey_challenge:${email}`);
    if (!expectedChallenge) {
      return errorResponse('invalid_challenge', 'Challenge expired or not found', 400, request);
    }

    const rpID = env.RP_ID || 'localhost';
    const origin = env.ORIGIN || 'http://localhost:8788';

    const opts: VerifyRegistrationResponseOpts = {
      response: registrationCredential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    };

    const verification = await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      return errorResponse('verification_failed', 'Credential verification failed', 400, request);
    }

    const { credential } = verification.registrationInfo;
    const now = Date.now();

    await env.DB.prepare(`
      UPDATE admin_users
      SET passkey_credential_id = ?,
          passkey_public_key = ?,
          passkey_counter = ?,
          passkey_device_type = ?,
          passkey_backed_up = ?,
          passkey_created_at = ?,
          passkey_last_used = ?,
          passkey_enabled = 1
      WHERE id = ?
    `).bind(
      credential.id,
      base64UrlEncode(credential.publicKey as Uint8Array),
      credential.counter,
      credential.transports?.join(',') || '',
      verification.registrationInfo.credentialBackedUp ? 1 : 0,
      now,
      now,
      user.id
    ).run();

    await env.KV.delete(`passkey_challenge:${email}`);

    return jsonResponse({ verified: true }, 200, request);
  } catch (error) {
    console.error('Passkey register finish error:', error);
    return errorResponse('server_error', 'Failed to complete registration', 500, request);
  }
}

export async function handlePasskeyLoginStart(request: Request, env: Env): Promise<Response> {
  try {
    const rpID = env.RP_ID || 'localhost';

    // 查詢所有已註冊的 Passkey credentials
    const credentials = await env.DB.prepare(
      'SELECT passkey_credential_id, passkey_public_key FROM admin_users WHERE passkey_enabled = 1 AND is_active = 1'
    ).all();

    const allowCredentials = credentials.results.map((cred: any) => ({
      id: cred.passkey_credential_id,
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as AuthenticatorTransport[]
    }));

    const opts: GenerateAuthenticationOptionsOpts = {
      rpID,
      allowCredentials
    };

    const options = await generateAuthenticationOptions(opts);

    // 儲存 challenge（使用 rpID 作為 key，因為沒有 email）
    await env.KV.put(`passkey_auth_challenge:${rpID}`, options.challenge, { expirationTtl: 300 });

    const corsHeaders = request ? getCorsHeaders(request) : {};
    return new Response(JSON.stringify(options), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Passkey login start error:', error);
    return errorResponse('server_error', 'Failed to start login', 500, request);
  }
}

export async function handlePasskeyLoginFinish(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { credential: AuthenticationResponseJSON };
    const { credential } = body;

    if (!credential) {
      return errorResponse('invalid_request', 'Credential required', 400, request);
    }

    const rpID = env.RP_ID || 'localhost';

    // 從 credential ID 查找用戶
    const user = await env.DB.prepare(`
      SELECT * FROM admin_users
      WHERE passkey_credential_id = ? AND is_active = 1 AND passkey_enabled = 1
    `).bind(credential.id).first() as any;

    if (!user || !user.passkey_credential_id) {
      return errorResponse('not_found', 'Passkey not configured', 404, request);
    }

    // Validate email format
    const email = user.username;
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return errorResponse('invalid_email', emailValidation.error || 'Invalid email format', 400, request);
    }

    // Check rate limit
    const rateLimit = await checkLoginRateLimit(email, env);
    if (!rateLimit.allowed) {
      const headers = new Headers({ 'Content-Type': 'application/json' });
      if (rateLimit.retryAfter) {
        headers.set('Retry-After', rateLimit.retryAfter.toString());
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: rateLimit.retryAfter
          }
        }),
        { status: 429, headers }
      );
    }

    const expectedChallenge = await env.KV.get(`passkey_auth_challenge:${rpID}`);
    if (!expectedChallenge) {
      return errorResponse('invalid_challenge', 'Challenge expired or not found', 400, request);
    }

    const origin = env.ORIGIN || 'http://localhost:8788';

    const opts: VerifyAuthenticationResponseOpts = {
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: user.passkey_credential_id,
        publicKey: base64UrlDecode(user.passkey_public_key) as ReturnType<Uint8Array['slice']>,
        counter: user.passkey_counter,
        transports: user.passkey_device_type ? user.passkey_device_type.split(',') as any : undefined
      }
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      await incrementLoginAttempts(email, env);
      return errorResponse('verification_failed', 'Authentication failed', 400, request);
    }

    const { authenticationInfo } = verification;

    // Touch ID 等平台認證器的 counter 可能永遠是 0
    // 只有當 counter 不是 0 時才檢查是否遞增
    if (authenticationInfo.newCounter !== 0 && authenticationInfo.newCounter <= user.passkey_counter) {
      console.error('Counter did not increment, possible replay attack');
      await incrementLoginAttempts(email, env);
      return errorResponse('replay_detected', 'Invalid counter', 400, request);
    }

    // Reset login attempts on successful authentication
    await resetLoginAttempts(email, env);

    const now = Date.now();
    await env.DB.prepare(`
      UPDATE admin_users
      SET passkey_counter = ?, passkey_last_used = ?, last_login_at = ?
      WHERE id = ?
    `).bind(authenticationInfo.newCounter, now, now, user.id).run();

    await env.KV.delete(`passkey_auth_challenge:${rpID}`);

    const sessionToken = crypto.randomUUID();
    await env.KV.put(`passkey_session:${sessionToken}`, user.username, { expirationTtl: 3600 });

    const isLocalhost = new URL(request.url).hostname === 'localhost';
    const cookieOptions = [
      `admin_token=${sessionToken}`,
      'HttpOnly',
      ...(isLocalhost ? [] : ['Secure']),
      'SameSite=Lax',
      'Max-Age=3600',
      'Path=/'
    ].join('; ');

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': cookieOptions
    });

    const reqOrigin = request.headers.get('Origin');
    const ALLOWED_ORIGINS = [
      'http://localhost:8788',
      'http://localhost:8787',
      'https://db-card-staging.csw30454.workers.dev',
      'https://db-card.moda.gov.tw'
    ];

    if (reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin)) {
      headers.set('Access-Control-Allow-Origin', reqOrigin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(
      JSON.stringify({ success: true, data: { authenticated: true } }),
      { headers }
    );
  } catch (error) {
    console.error('Passkey login finish error:', error);
    return errorResponse('server_error', 'Failed to complete authentication', 500, request);
  }
}

export async function handlePasskeyStatus(
  request: Request,
  env: Env,
  adminEmail: string
): Promise<Response> {
  try {
    const user = await env.DB.prepare(`
      SELECT passkey_enabled FROM admin_users
      WHERE username = ? AND is_active = 1
    `).bind(adminEmail).first() as any;

    if (!user) {
      return errorResponse('not_found', 'User not found', 404, request);
    }

    return jsonResponse({ hasPasskey: user.passkey_enabled === 1 }, 200, request);
  } catch (error) {
    console.error('Passkey status error:', error);
    return errorResponse('server_error', 'Failed to check passkey status', 500, request);
  }
}

export async function handlePasskeyAvailable(request: Request, env: Env): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM admin_users WHERE passkey_enabled = 1 AND is_active = 1'
    ).first<{ count: number }>();

    const hasPasskey = result && result.count > 0;

    const corsHeaders = request ? getCorsHeaders(request) : {};
    return new Response(JSON.stringify({ hasPasskey }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Passkey available check error:', error);
    return new Response(JSON.stringify({ hasPasskey: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
