--liquibase formatted sql
--changeset securetag:011_expand_ban_scope

-- Rename table to be more generic
ALTER TABLE securetag.ip_reputation RENAME TO security_ban;

-- Add new columns for broader ban scope
ALTER TABLE securetag.security_ban 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'ip', -- 'ip', 'api_key', 'tenant'
ADD COLUMN IF NOT EXISTS value TEXT, -- The IP, API Key Hash, or Tenant ID
ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE;

-- Migrate existing data (IPs)
UPDATE securetag.security_ban SET type = 'ip', value = ip_address WHERE value IS NULL;

-- Make value mandatory and primary key component (drop old PK first)
ALTER TABLE securetag.security_ban DROP CONSTRAINT ip_reputation_pkey;
ALTER TABLE securetag.security_ban ADD PRIMARY KEY (type, value);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_security_ban_lookup ON securetag.security_ban(type, value, is_banned);
