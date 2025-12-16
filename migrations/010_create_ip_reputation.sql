--liquibase formatted sql
--changeset securetag:010_create_ip_reputation

CREATE TABLE IF NOT EXISTS securetag.ip_reputation (
    ip_address TEXT PRIMARY KEY,
    violation_count INTEGER DEFAULT 0,
    is_banned BOOLEAN DEFAULT FALSE,
    banned_until TIMESTAMP WITH TIME ZONE,
    last_violation_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_reputation_banned ON securetag.ip_reputation(is_banned);
