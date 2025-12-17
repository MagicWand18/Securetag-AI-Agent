--liquibase formatted sql
--changeset securetag:017_add_task_double_check

-- Add double_check_config to task table
-- This will store: { "enabled": true, "level": "standard|pro|max", "provider_used": "openai|anthropic", "model_used": "..." }
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS double_check_config JSONB;
