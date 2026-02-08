--liquibase formatted sql

--changeset ai-shield:028-ai-gateway-tenant
--comment: Habilitar AI Shield a nivel tenant y api_key

-- Habilitar AI Shield a nivel tenant
ALTER TABLE securetag.tenant
    ADD COLUMN IF NOT EXISTS ai_gateway_enabled BOOLEAN DEFAULT false;

-- Habilitar AI Shield a nivel api_key
ALTER TABLE securetag.api_key
    ADD COLUMN IF NOT EXISTS ai_gateway_enabled BOOLEAN DEFAULT false;
