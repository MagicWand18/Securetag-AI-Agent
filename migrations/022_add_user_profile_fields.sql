--liquibase formatted sql
--changeset securetag:022_add_user_profile_fields

ALTER TABLE securetag.app_user
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS about TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
