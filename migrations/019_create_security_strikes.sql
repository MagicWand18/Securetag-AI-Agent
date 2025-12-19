--liquibase formatted sql
--changeset securetag:013_create_security_strikes

CREATE TABLE IF NOT EXISTS securetag.security_strike (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'ip', 'api_key', 'tenant', 'user'
    value TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for fast counting within time windows
CREATE INDEX IF NOT EXISTS idx_security_strike_lookup ON securetag.security_strike(type, value, created_at);
