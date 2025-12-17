--liquibase formatted sql
--changeset securetag:014_create_users_table

-- Create app_user table
CREATE TABLE IF NOT EXISTS securetag.app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- admin, member, viewer
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(email)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_user_tenant ON securetag.app_user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_user_email ON securetag.app_user(email);
