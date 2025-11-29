-- Migration 003: Authentication and Multi-tenancy
-- Create schema and extensions
CREATE SCHEMA IF NOT EXISTS securetag;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tenant table if not exists (dependency for api_key)
CREATE TABLE IF NOT EXISTS securetag.tenant (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default production tenant
INSERT INTO securetag.tenant (id, name) VALUES ('production', 'Production Tenant') ON CONFLICT (id) DO NOTHING;
INSERT INTO securetag.tenant (id, name) VALUES ('default', 'Default Tenant') ON CONFLICT (id) DO NOTHING;

-- Create api_key table for API authentication
CREATE TABLE IF NOT EXISTS securetag.api_key (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  scopes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_api_key_hash ON securetag.api_key(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_key_tenant ON securetag.api_key(tenant_id);
