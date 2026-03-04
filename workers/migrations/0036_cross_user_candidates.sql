-- Migration 0036: Phase A - Cross-User Candidate Matching
-- 跨使用者候選匹配（只記錄候選，不自動更新）

-- 1. 跨使用者匹配候選表
CREATE TABLE cross_user_match_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 匹配的兩張名片
  card_a_uuid TEXT NOT NULL,
  card_a_user TEXT NOT NULL,
  card_b_uuid TEXT NOT NULL,
  card_b_user TEXT NOT NULL,
  
  -- Canonicalized pair key (方向無關)
  person_pair_key TEXT NOT NULL,
  
  -- 匹配資訊
  match_confidence INTEGER NOT NULL,  -- 85-100
  match_method TEXT NOT NULL,         -- 'email_exact' | 'phone_exact' | 'context_match'
  match_evidence TEXT NOT NULL,       -- JSON: {email_match: true, ...}
  
  -- 時間戳
  detected_at INTEGER NOT NULL,
  
  -- 驗證狀態 (用於量測 precision)
  validation_status TEXT DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'rejected'
  validated_at INTEGER,
  validated_by TEXT,
  
  FOREIGN KEY (card_a_uuid) REFERENCES received_cards(uuid),
  FOREIGN KEY (card_b_uuid) REFERENCES received_cards(uuid)
);

CREATE INDEX idx_candidates_pair ON cross_user_match_candidates(person_pair_key);
CREATE INDEX idx_candidates_card_a ON cross_user_match_candidates(card_a_uuid);
CREATE INDEX idx_candidates_card_b ON cross_user_match_candidates(card_b_uuid);
CREATE INDEX idx_candidates_confidence ON cross_user_match_candidates(match_confidence);
CREATE INDEX idx_candidates_validation ON cross_user_match_candidates(validation_status);
CREATE INDEX idx_candidates_detected ON cross_user_match_candidates(detected_at);

-- 2. 匹配黑名單 (防止重複處理)
CREATE TABLE matching_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Canonicalized pair key
  person_pair_key TEXT NOT NULL UNIQUE,
  
  -- 原因與時效
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  
  -- 審計
  created_by TEXT,
  notes TEXT
);

CREATE INDEX idx_blacklist_pair ON matching_blacklist(person_pair_key);
CREATE INDEX idx_blacklist_expires ON matching_blacklist(expires_at);

-- 回滾方案（註解）
-- DROP TABLE IF EXISTS cross_user_match_candidates;
-- DROP TABLE IF EXISTS matching_blacklist;
