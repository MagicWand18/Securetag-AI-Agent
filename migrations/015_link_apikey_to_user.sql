--liquibase formatted sql
--changeset securetag:015_link_apikey_to_user

-- Add user_id column to api_key
ALTER TABLE securetag.api_key ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES securetag.app_user(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_api_key_user ON securetag.api_key(user_id);
