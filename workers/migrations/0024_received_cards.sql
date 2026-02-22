-- Migration 0024: received_cards table
-- Purpose: Store received business cards with AI-generated content
-- Version: v3.3 Final (2026-02-22)

CREATE TABLE IF NOT EXISTS received_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  
  -- vCard fields
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  organization TEXT,
  title TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  note TEXT,
  
  -- AI-generated content
  company_summary TEXT,
  personal_summary TEXT,
  ai_sources_json TEXT,
  
  -- Original data
  original_image_url TEXT,
  ocr_raw_text TEXT,
  
  -- Timestamps
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  
  FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_received_cards_user ON received_cards(user_email, deleted_at);
CREATE INDEX IF NOT EXISTS idx_received_cards_created ON received_cards(created_at DESC);
