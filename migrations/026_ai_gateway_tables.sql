--liquibase formatted sql

--changeset ai-shield:026-ai-gateway-tables
--comment: Tablas de configuracion para AI Shield (AI Security Gateway)

-- Config de AI Shield por tenant
CREATE TABLE securetag.ai_gateway_config (
    tenant_id VARCHAR(50) PRIMARY KEY REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    allowed_models JSONB DEFAULT '["*"]',
    blocked_models JSONB DEFAULT '[]',
    max_tokens_per_request INTEGER DEFAULT 4096,
    max_requests_per_minute INTEGER DEFAULT 60,
    pii_action TEXT DEFAULT 'redact' CHECK (pii_action IN ('redact', 'block', 'log_only')),
    pii_entities JSONB DEFAULT '["CREDIT_CARD","EMAIL_ADDRESS","PHONE_NUMBER","PERSON","US_SSN","IP_ADDRESS"]',
    prompt_injection_enabled BOOLEAN DEFAULT true,
    secrets_scanning_enabled BOOLEAN DEFAULT true,
    output_scanning_enabled BOOLEAN DEFAULT true,
    prompt_logging_mode TEXT DEFAULT 'hash' CHECK (prompt_logging_mode IN ('hash', 'encrypted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permisos AI sobre api_key existente + BYOK provider keys
CREATE TABLE securetag.ai_gateway_key_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    api_key_id UUID NOT NULL REFERENCES securetag.api_key(id) ON DELETE CASCADE,
    key_alias TEXT NOT NULL,
    model_access JSONB DEFAULT '["*"]',
    rate_limit_rpm INTEGER DEFAULT 30,
    provider_keys_encrypted JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, key_alias),
    UNIQUE(api_key_id)
);
