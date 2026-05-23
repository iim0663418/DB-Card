// TypeScript Type Definitions for DB-Card API
// Based on ADR-002 and ADR-003

export interface Env {
  DB: D1Database;
  KV: KVNamespace;  // Used for card type cache only (idempotency moved to DO)
  RATE_LIMITER: DurableObjectNamespace;
  LEARNING_COUNTER: DurableObjectNamespace;  // Phase 0.3: Atomic daily learning counter
  LEARNING_BATCHER: DurableObjectNamespace;  // Phase 3: Batch learning with Alarm API
  PHYSICAL_CARDS: R2Bucket;
  VECTORIZE: VectorizeIndex;  // Vectorize 綁定
  KEK: string;
  OLD_KEK?: string;
  SETUP_TOKEN?: string;
  EMERGENCY_BYPASS?: string;
  RP_ID?: string;
  ORIGIN?: string;
  ENVIRONMENT: 'production' | 'staging';
  WORKER_URL: string;
  CUSTOM_DOMAIN?: string;  // e.g. https://db-card.sfan-tech.com
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;  // gemini-3-flash-preview
  GEMINI_LITE_MODEL: string;  // gemini-2.5-flash (lightweight tasks)
  GEMINI_EMBEDDING_MODEL: string;  // text-embedding-004
  FILE_SEARCH_STORE_NAME?: string;
  ctx?: ExecutionContext;  // For waitUntil in auto-learning
  // Agent Search feature flags (Phase 2)
  AGENT_SHADOW_MODE?: string;   // 'true' to enable shadow mode (log only, no routing)
  ENABLE_AGENT_SEARCH?: string; // 'true' to enable agent-based routing
  ENABLE_AGENT_META?: string;   // 'true' to include meta field in search response
}

// Bilingual support types
export type BilingualString = string | { zh: string; en: string };
export type BilingualStringArray = string[] | { zh: string[]; en: string[] };

export interface CardData {
  name: BilingualString;
  title: BilingualString;
  department?: BilingualString;
  organization?: BilingualString;
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  address?: BilingualString;
  greetings?: BilingualStringArray;
  socialLinks?: {
    email?: string;
    socialNote?: string;
  };
}

export type CardType = 'personal' | 'event_booth' | 'sensitive';

export interface Card {
  uuid: string;
  card_type: CardType;
  encrypted_payload: string;
  wrapped_dek: string;
  key_version: number;
  status: 'active' | 'suspended' | 'deleted';
  created_at: number;
  updated_at: number;
  owner_email?: string;
}

export interface ReadSession {
  session_id: string;
  card_uuid: string;
  issued_at: number;
  expires_at: number;
  max_reads: number;  // Maximum concurrent reads allowed
  reads_used: number;
  revoked_at?: number;
  revoked_reason?: 'retap' | 'admin' | 'emergency' | 'card_updated' | 'card_deleted';
  policy_version?: string;
  token_version: number;
}

export interface CardPolicy {
  ttl: number;        // milliseconds
  max_reads: number;  // Maximum concurrent reads allowed
  scope: 'public' | 'private';
  max_total_sessions: number;
  max_sessions_per_day: number;
  max_sessions_per_month: number;
  warning_threshold: number;
}

export const CARD_POLICIES: Record<CardType, CardPolicy> = {
  personal: {
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    max_reads: 20,
    scope: 'public',
    max_total_sessions: 10000,    // 1000 → 10000 (×10)
    max_sessions_per_day: 100,    // 10 → 100 (×10)
    max_sessions_per_month: 1000, // 100 → 1000 (×10)
    warning_threshold: 0.9,
  },
  event_booth: {
    ttl: 24 * 60 * 60 * 1000,
    max_reads: 50,
    scope: 'public',
    max_total_sessions: 50000,    // 5000 → 50000 (×10)
    max_sessions_per_day: 500,    // 50 → 500 (×10)
    max_sessions_per_month: 5000, // 500 → 5000 (×10)
    warning_threshold: 0.9,
  },
  sensitive: {
    ttl: 24 * 60 * 60 * 1000,
    max_reads: 5,
    scope: 'public',
    max_total_sessions: 100,
    max_sessions_per_day: 3,
    max_sessions_per_month: 30,
    warning_threshold: 0.8,
  }
};

export interface AuditLog {
  id?: number;
  event_type: 'tap' | 'read' | 'create' | 'card_create' | 'card_update' | 'card_delete' | 'card_revoke' | 'card_restore' | 'card_permanent_delete' | 'update' | 'delete' | 'revoke' | 'admin_revoke' | 'emergency_revoke' | 'kek_rotation' | 'user_card_create' | 'user_card_update' | 'user_card_revoke' | 'user_card_restore';
  card_uuid?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: number;
  details?: string;
  actor_type?: 'admin' | 'user' | 'system';
  actor_id?: string;
  target_uuid?: string;
}

// User Self-Service Types (v2.0)
export type UserCardType = 'personal' | 'event' | 'sensitive';
export type UUIDBindingStatus = 'bound' | 'revoked' | 'quarantine';

export interface UUIDBinding {
  uuid: string;
  type: UserCardType;
  status: UUIDBindingStatus;
  bound_email: string | null;
  bound_at: number | null;
  created_ip: string | null;
  created_user_agent: string | null;
  revoked_at: number | null;
  revoke_reason: string | null;
  quarantine_until: number | null;
}

export interface UserCardCreateRequest {
  type: UserCardType;
  name_zh: string;
  name_en: string;
  title_zh?: string;
  title_en?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  email: string;
  address_zh?: string;
  address_en?: string;
  avatar_url?: string;
  greetings_zh?: string;
  greetings_en?: string;
  social_github?: string;
  social_linkedin?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_youtube?: string;
  social_line?: string;
  social_signal?: string;
}

export interface UserCardUpdateRequest {
  name_zh?: string;
  name_en?: string;
  title_zh?: string;
  title_en?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address_zh?: string;
  address_en?: string;
  avatar_url?: string;
  greetings_zh?: string;
  greetings_en?: string;
  social_github?: string;
  social_linkedin?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_youtube?: string;
  social_line?: string;
  social_signal?: string;
}

// Self-Card Extract Draft Types
export type FieldProvenance = 'observed' | 'translated' | 'inferred';

export interface DraftField<T = string> {
  value: T;
  provenance: FieldProvenance;
}

export interface UserCardExtractDraft {
  schema_version: string;
  fields: {
    name_zh: DraftField;
    name_en: DraftField;
    title_zh: DraftField | null;
    title_en: DraftField | null;
    department: DraftField | null;
    email: DraftField | null;
    phone: DraftField | null;
    mobile: DraftField | null;
    address_zh: DraftField | null;
    address_en: DraftField | null;
    social_linkedin: DraftField | null;
    social_line: DraftField | null;
    social_facebook: DraftField | null;
    social_instagram: DraftField | null;
    social_twitter: DraftField | null;
    social_youtube: DraftField | null;
    social_github: DraftField | null;
    social_signal: DraftField | null;
    website: DraftField | null;
    organization: DraftField | null;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// User Self-Revoke Types
export type RevocationReason = 'lost' | 'suspected_leak' | 'info_update' | 'misdelivery' | 'other';

export interface RevokeCardRequest {
  reason?: RevocationReason;
}

export interface RevokeCardResponse {
  success: boolean;
  message: string;
  revoked_at: string;
  sessions_revoked: number;
  restore_deadline: string;
}

export interface RateLimitError {
  error: string;
  message: string;
  retry_after: number;
  limits: {
    hourly: { limit: number; remaining: number; reset_at: string };
    daily: { limit: number; remaining: number; reset_at: string };
  };
}

export interface RestoreCardResponse {
  success: boolean;
  message: string;
  restored_at: string;
}

export interface RevocationHistoryEntry {
  card_uuid: string;
  card_name: string;
  action: 'revoke' | 'restore';
  reason: RevocationReason | null;
  timestamp: string;
  sessions_affected: number;
}

export interface RevocationHistoryResponse {
  history: RevocationHistoryEntry[];
  total: number;
  limit: number;
}

// Rate Limiting Types (Durable Objects)
export type RateLimitDimension = 'card_uuid' | 'ip';

export interface RateLimitResult {
  allowed: boolean;
  current?: number;
  limit?: number;
  retry_after?: number;
  dimension?: RateLimitDimension;
  window?: 'day';
}

// Session Budget Types
export interface SessionBudgetResult {
  allowed: boolean;
  reason?: 'total_limit_exceeded' | 'daily_limit_exceeded' | 'monthly_limit_exceeded';
  warning?: {
    type: 'approaching_budget_limit';
    message: string;
    remaining: number;
    max_total: number;
  } | null;
  remaining?: number;
  daily_remaining?: number;
  monthly_remaining?: number;
  details?: {
    total_sessions?: number;
    max_total_sessions?: number;
    daily_sessions?: number;
    max_sessions_per_day?: number;
    monthly_sessions?: number;
    max_sessions_per_month?: number;
    retry_after?: string;
  };
}

// Admin Authentication Types
export interface AdminLoginRequest {
  email: string;
  token: string;
}

// Asset Upload Types
export type AssetType = 'twin_front' | 'twin_back' | 'avatar';
export type AssetStatus = 'ready' | 'stale' | 'error';

export interface Asset {
  asset_id: string;
  card_uuid: string;
  asset_type: AssetType;
  current_version: number;
  r2_key_prefix: string;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
}

export interface AssetVersion {
  asset_id: string;
  version: number;
  size_original: number;
  size_detail: number;
  size_thumb: number;
  created_at: string;
  soft_deleted_at?: string;
}

export interface AssetUploadResponse {
  asset_id: string;
  current_version: number;
  variants: {
    detail: string;
    thumb: string;
  };
  size: {
    original: number;
    detail: number;
    thumb: number;
  };
}

// Twin Status Types
export type TwinStatus = 'ready' | 'stale' | 'disabled' | 'error';

export interface TwinStatusRecord {
  card_uuid: string;
  enabled: boolean;
  status: TwinStatus;
  last_rebuild_at: string | null;
  error_message: string | null;
}

// Monitoring API Types
export interface MonitoringMetrics {
  total: number;
  success: number;
  failed: number;
  success_rate: number;
}

export interface RateLimitMetrics {
  upload_triggered: number;
  read_triggered: number;
  trigger_rate: number;
}

export interface ErrorMetrics {
  total: number;
  by_type: Record<string, number>;
}

export interface AlertItem {
  level: 'critical' | 'warning';
  metric: string;
  message: string;
  value: number;
  threshold: number;
}

export interface MonitoringOverview {
  upload: MonitoringMetrics;
  read: MonitoringMetrics;
  rate_limit: RateLimitMetrics;
  errors: ErrorMetrics;
  alerts: AlertItem[];
}

export interface HealthCheckItem {
  status: 'ok' | 'error';
  latency?: number;
  error?: string;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheckItem;
    r2: HealthCheckItem;
    kv: HealthCheckItem;
  };
  alerts: AlertItem[];
  timestamp: number;
}

// ── RAG / Vectorize Types ─────────────────────────────────────────────────────

/**
 * Flat representation of a row from the `received_cards` table, used by
 * embedding generation, deduplication, and search modules.
 *
 * 13 content fields + identity/timestamp fields.
 */
export interface ReceivedCardData {
  uuid?: string;
  user_email?: string;
  // Content fields (13)
  full_name: string;
  organization?: string;
  organization_en?: string;
  organization_alias?: string;
  organization_normalized?: string;
  title?: string;
  department?: string;
  company_summary?: string;
  personal_summary?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  note?: string;
  // Timestamps
  created_at?: number;
  updated_at?: number;
}

/**
 * Metadata stored alongside each Vectorize vector.
 *
 * Organised into three conceptual layers:
 *   - **Filter** — used for pre-filtering to narrow the ANN search space.
 *   - **Display** — returned with results for UI rendering.
 *   - **Timestamp** — used for recency-based filtering / sorting.
 */
export interface VectorMetadata {
  // Filter layer (pre-filtering, reduces ANN latency 30-50%)
  user_email: string;
  organization_normalized: string;
  industry?: string;
  location?: string;

  // Display layer (returned in search results)
  full_name: string;
  organization: string;
  title: string;
  department?: string;

  // Timestamp layer (recency filtering)
  created_at: number;
  updated_at: number;
}
