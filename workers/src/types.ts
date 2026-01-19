// TypeScript Type Definitions for DB-Card API
// Based on ADR-002 and ADR-003

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  KEK: string;
  OLD_KEK?: string;
  SETUP_TOKEN?: string;
  ENVIRONMENT: 'production' | 'staging';
  ASSETS: Fetcher;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
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
  max_reads: number;
  reads_used: number;
  revoked_at?: number;
  revoked_reason?: 'retap' | 'admin' | 'emergency' | 'card_updated' | 'card_deleted';
  policy_version?: string;
  token_version: number;
}

export interface CardPolicy {
  ttl: number;        // milliseconds
  max_reads: number;
  scope: 'public' | 'private';
}

export const CARD_POLICIES: Record<CardType, CardPolicy> = {
  personal: {
    ttl: 24 * 60 * 60 * 1000,  // 24 hours
    max_reads: 20,
    scope: 'public'
  },
  event_booth: {
    ttl: 24 * 60 * 60 * 1000,
    max_reads: 50,
    scope: 'public'
  },
  sensitive: {
    ttl: 24 * 60 * 60 * 1000,
    max_reads: 5,
    scope: 'public'
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
