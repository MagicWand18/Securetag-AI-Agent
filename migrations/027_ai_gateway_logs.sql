--liquibase formatted sql

--changeset ai-shield:027-ai-gateway-logs
--comment: Tablas de logs e incidentes PII para AI Shield

-- Log de cada request proxeado
CREATE TABLE securetag.ai_gateway_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    api_key_id UUID,
    request_model TEXT NOT NULL,
    request_provider TEXT NOT NULL,
    prompt_hash TEXT,
    prompt_encrypted TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    cost_usd NUMERIC(10,6),
    credits_charged NUMERIC(10,4) NOT NULL DEFAULT 0,
    latency_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'blocked_pii', 'blocked_injection', 'blocked_secrets', 'blocked_policy', 'blocked_credits', 'error')),
    pii_detected JSONB,
    secrets_detected JSONB,
    injection_score NUMERIC(5,4),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_gw_log_tenant ON securetag.ai_gateway_log(tenant_id, created_at DESC);
CREATE INDEX idx_ai_gw_log_status ON securetag.ai_gateway_log(status);
CREATE INDEX idx_ai_gw_log_key ON securetag.ai_gateway_log(api_key_id, created_at DESC);

-- Detalle de incidentes PII
CREATE TABLE securetag.ai_gateway_pii_incident (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES securetag.ai_gateway_log(id) ON DELETE CASCADE,
    tenant_id VARCHAR(50) NOT NULL,
    entity_type TEXT NOT NULL,
    action_taken TEXT NOT NULL CHECK (action_taken IN ('redacted', 'blocked', 'logged')),
    confidence NUMERIC(5,4),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_gw_pii_tenant ON securetag.ai_gateway_pii_incident(tenant_id, created_at DESC);
