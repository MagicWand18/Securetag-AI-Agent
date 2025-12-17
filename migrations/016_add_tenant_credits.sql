--liquibase formatted sql
--changeset securetag:016_add_tenant_credits

-- Add credits balance to tenant
ALTER TABLE securetag.tenant ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 0;

-- Add encrypted LLM configuration (BYOK support)
-- We store it as JSONB, application layer handles PGP encryption/decryption logic if needed,
-- or we rely on pgcrypto functions if we want DB-level encryption.
-- For simplicity and flexibility with Node.js crypto, we'll store it as JSONB for now,
-- assuming the value inside is what matters.
ALTER TABLE securetag.tenant ADD COLUMN IF NOT EXISTS llm_config JSONB;

-- Add check constraint to prevent negative credits (optional but safe)
ALTER TABLE securetag.tenant ADD CONSTRAINT check_positive_credits CHECK (credits_balance >= 0);
