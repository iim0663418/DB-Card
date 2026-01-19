-- Migration: Sync cards.card_type with uuid_bindings.type
-- Date: 2026-01-19
-- Purpose: Ensure cards.card_type matches uuid_bindings.type after type migration

-- Update cards.card_type to match uuid_bindings.type
UPDATE cards
SET card_type = (
  SELECT b.type 
  FROM uuid_bindings b 
  WHERE b.uuid = cards.uuid
)
WHERE uuid IN (SELECT uuid FROM uuid_bindings);
