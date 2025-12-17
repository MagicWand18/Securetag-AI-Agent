-- Liquibase formatted sql

-- changeset securetag:013_add_progress_tracking
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS eta_seconds INTEGER DEFAULT NULL;
