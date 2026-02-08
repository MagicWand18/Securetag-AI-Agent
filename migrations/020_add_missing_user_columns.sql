--liquibase formatted sql
--changeset securetag:020_add_missing_user_columns

ALTER TABLE securetag.app_user ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE securetag.app_user ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE securetag.app_user ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
