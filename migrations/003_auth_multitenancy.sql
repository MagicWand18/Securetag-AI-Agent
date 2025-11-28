-- Migration 003: Authentication and Multi-tenancy
-- Create api_key table for API authentication

CREATE TABLE IF NOT EXISTS securetag.api_key (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_key_hash ON securetag.api_key(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_tenant ON securetag.api_key(tenant_id);

-- Insert test API keys for development (using simple hashing for demo)
-- In production, use proper bcrypt/argon2 hashing
-- Key: test-key-tenant-a (for tenant 'default' or first tenant)
-- Key: test-key-tenant-b (for a second test tenant)

-- Note: We'll insert actual keys programmatically after creating tenants
