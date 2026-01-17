// TypeScript Type Definitions for DB-Card API
// Based on ADR-002 and ADR-003

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  KEK: string;
  SETUP_TOKEN?: string;
  ENVIRONMENT: 'production' | 'staging';
}

export interface CardData {
  name: string;
  title: string;
  department?: string;
  organization?: string;
  email: string;
  phone?: string;
  mobile?: string;
  avatar?: string;
  address?: string;
  greetings?: string[];
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
  event_type: 'tap' | 'read' | 'create' | 'update' | 'delete' | 'revoke';
  card_uuid?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  timestamp: number;
  details?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
