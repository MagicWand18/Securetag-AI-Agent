--liquibase formatted sql
--changeset securetag:009_create_security_events

CREATE TABLE IF NOT EXISTS securetag.security_event (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    file_hash TEXT,
    file_name TEXT,
    provider TEXT,
    status TEXT,
    reason TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_event_tenant ON securetag.security_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_event_hash ON securetag.security_event(file_hash);
CREATE INDEX IF NOT EXISTS idx_security_event_created_at ON securetag.security_event(created_at);
