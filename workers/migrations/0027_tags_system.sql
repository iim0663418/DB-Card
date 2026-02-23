-- Migration 0027: Tags System
-- 標籤系統 - 分類與篩選名片

-- 1. 標籤關聯表
CREATE TABLE card_tags (
  card_uuid TEXT NOT NULL,
  tag TEXT NOT NULL,
  tag_source TEXT NOT NULL DEFAULT 'manual',
  created_at INTEGER NOT NULL,
  PRIMARY KEY (card_uuid, tag),
  FOREIGN KEY (card_uuid) REFERENCES received_cards(uuid) ON DELETE CASCADE
);

CREATE INDEX idx_card_tags_tag ON card_tags(tag);
CREATE INDEX idx_card_tags_card ON card_tags(card_uuid);
CREATE INDEX idx_card_tags_source ON card_tags(tag_source);

-- 2. 標籤統計表（快取）
CREATE TABLE tag_stats (
  user_email TEXT NOT NULL,
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated INTEGER NOT NULL,
  PRIMARY KEY (user_email, tag)
);

CREATE INDEX idx_tag_stats_user ON tag_stats(user_email);
CREATE INDEX idx_tag_stats_count ON tag_stats(user_email, count DESC);

-- 回滾方案（註解）
-- DROP TABLE IF EXISTS card_tags;
-- DROP TABLE IF EXISTS tag_stats;
