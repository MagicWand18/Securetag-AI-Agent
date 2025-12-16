--liquibase formatted sql
--changeset securetag:012_fix_ban_schema

ALTER TABLE securetag.security_ban DROP COLUMN IF EXISTS ip_address;
