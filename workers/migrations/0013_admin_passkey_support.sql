-- Migration 0013: Add Passkey support to admin_users
-- Created: 2026-01-21
-- Purpose: Enable WebAuthn/FIDO2 Passkey authentication for administrators

-- Add Passkey credential fields
ALTER TABLE admin_users ADD COLUMN passkey_credential_id TEXT;
ALTER TABLE admin_users ADD COLUMN passkey_public_key TEXT;
ALTER TABLE admin_users ADD COLUMN passkey_counter INTEGER DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN passkey_device_type TEXT;
ALTER TABLE admin_users ADD COLUMN passkey_backed_up INTEGER DEFAULT 0;
ALTER TABLE admin_users ADD COLUMN passkey_created_at INTEGER;
ALTER TABLE admin_users ADD COLUMN passkey_last_used INTEGER;
ALTER TABLE admin_users ADD COLUMN passkey_enabled INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_passkey_credential ON admin_users(passkey_credential_id);
CREATE INDEX IF NOT EXISTS idx_admin_passkey_enabled ON admin_users(passkey_enabled);

-- Note: Once passkey_enabled = 1, SETUP_TOKEN login is disabled for that admin
-- To reset: Use wrangler d1 execute to set passkey_enabled = 0
