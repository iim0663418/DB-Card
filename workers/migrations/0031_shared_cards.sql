-- Migration 0031: Shared Cards Feature (for logged-in users)
-- Purpose: Allow users to share received cards with other users

-- Step 1: Add composite unique index to received_cards for ownership verification
CREATE UNIQUE INDEX IF NOT EXISTS idx_received_cards_uuid_owner 
ON received_cards(uuid, user_email);

-- Step 2: Create shared_cards table (for sharing with other users)
CREATE TABLE IF NOT EXISTS shared_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uuid TEXT NOT NULL UNIQUE,  -- Each card can only be shared once
  owner_email TEXT NOT NULL,
  shared_at INTEGER NOT NULL,
  
  -- Composite foreign key: ensures owner_email actually owns the card_uuid
  FOREIGN KEY (card_uuid, owner_email) 
    REFERENCES received_cards(uuid, user_email) 
    ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_shared_cards_owner ON shared_cards(owner_email);
CREATE INDEX IF NOT EXISTS idx_shared_cards_shared_at ON shared_cards(shared_at DESC);
