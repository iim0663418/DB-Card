-- migrations/0001_initial_schema.sql
-- DB-Card Backend Migration - Initial Schema
-- Created: 2026-01-18

-- 1. KEK 版本管理表
CREATE TABLE kek_versions (
  version INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL,
  rotated_at INTEGER,
  status TEXT DEFAULT 'active'
);

-- 2. 名片主表 (Envelope Encryption)
CREATE TABLE cards (
  uuid TEXT PRIMARY KEY,
  card_type TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  wrapped_dek TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  owner_email TEXT,
  FOREIGN KEY (key_version) REFERENCES kek_versions(version)
);

CREATE INDEX idx_cards_card_type ON cards(card_type);
CREATE INDEX idx_cards_key_version ON cards(key_version);
CREATE INDEX idx_cards_status ON cards(status);

-- 3. ReadSession 授權表
CREATE TABLE read_sessions (
  session_id TEXT PRIMARY KEY,
  card_uuid TEXT NOT NULL,
  issued_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  max_reads INTEGER NOT NULL,
  reads_used INTEGER DEFAULT 0,
  revoked_at INTEGER,
  revoked_reason TEXT,
  policy_version TEXT,
  token_version INTEGER DEFAULT 1,
  FOREIGN KEY (card_uuid) REFERENCES cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_card_uuid ON read_sessions(card_uuid);
CREATE INDEX idx_sessions_expires_at ON read_sessions(expires_at);
CREATE INDEX idx_sessions_token_version ON read_sessions(token_version);

-- 4. 操作審計日誌
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  card_uuid TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  timestamp INTEGER NOT NULL,
  details TEXT
);

CREATE INDEX idx_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_logs_session_id ON audit_logs(session_id);

-- 5. 管理員帳號
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  is_active INTEGER DEFAULT 1
);

-- 初始化 KEK version 1
INSERT INTO kek_versions (version, created_at, status) 
VALUES (1, strftime('%s', 'now') * 1000, 'active');
