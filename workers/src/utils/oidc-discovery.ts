/**
 * OIDC Phase 2: Discovery Endpoint
 *
 * BDD Scenarios:
 * - Scenario 6: 取得 Google OIDC Discovery 配置
 * - Scenario 7: 使用快取的 Discovery 配置
 * - Scenario 8: Discovery 快取過期後自動更新
 * - Scenario 9: Discovery 取得失敗的降級處理
 */

export interface OIDCDiscoveryConfig {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint: string;
}

const DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration';
const CACHE_KEY = 'oidc_discovery:google';
const CACHE_TTL = 86400; // 24 hours

// Hardcoded fallback endpoints (最後手段)
const FALLBACK_ENDPOINTS: OIDCDiscoveryConfig = {
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  userinfo_endpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
};

/**
 * Scenario 6: 從 Google 取得 Discovery 配置
 */
export async function fetchGoogleDiscovery(): Promise<OIDCDiscoveryConfig> {
  const response = await fetch(DISCOVERY_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch discovery config: ${response.status}`);
  }

  const config = await response.json() as OIDCDiscoveryConfig;

  // 驗證必要欄位
  if (!config.authorization_endpoint || !config.token_endpoint ||
      !config.jwks_uri || !config.userinfo_endpoint) {
    throw new Error('Invalid discovery config: missing required endpoints');
  }

  return config;
}

/**
 * Scenario 7: 從 KV 讀取快取
 */
export async function getCachedDiscovery(env: Env): Promise<OIDCDiscoveryConfig | null> {
  const cached = await env.KV.get(CACHE_KEY, 'json');
  return cached as OIDCDiscoveryConfig | null;
}

/**
 * Scenario 6: 寫入 KV 快取
 */
export async function setCachedDiscovery(config: OIDCDiscoveryConfig, env: Env): Promise<void> {
  await env.KV.put(CACHE_KEY, JSON.stringify(config), {
    expirationTtl: CACHE_TTL,
  });
}

/**
 * 主要函數：取得 Discovery 配置
 *
 * Flow:
 * 1. Scenario 7: 優先從快取讀取
 * 2. Scenario 6/8: 快取不存在或過期時從 Google 取得
 * 3. Scenario 9: 取得失敗時使用舊快取或硬編碼端點
 */
export async function getDiscoveryConfig(env: Env): Promise<OIDCDiscoveryConfig> {
  // Scenario 7: 從 KV 讀取快取
  const cached = await getCachedDiscovery(env);
  if (cached) {
    return cached;
  }

  // Scenario 6/8: 從 Google 取得配置
  try {
    const config = await fetchGoogleDiscovery();

    // 快取到 KV
    await setCachedDiscovery(config, env);

    return config;
  } catch (error) {
    // Scenario 9: 降級處理
    console.error('Failed to fetch discovery config:', error);

    // 嘗試使用舊的快取（即使過期）
    const staleCache = await env.KV.get(CACHE_KEY, 'json');
    if (staleCache) {
      console.warn('Using stale discovery cache');
      return staleCache as OIDCDiscoveryConfig;
    }

    // 最後手段：使用硬編碼端點
    console.warn('Using hardcoded fallback endpoints');
    return FALLBACK_ENDPOINTS;
  }
}
