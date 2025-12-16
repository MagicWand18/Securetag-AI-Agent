--liquibase formatted sql
--changeset securetag:007_widen_finding_columns

-- Increase column sizes for finding table to accommodate verbose tool outputs
ALTER TABLE securetag.finding ALTER COLUMN cwe TYPE TEXT;
ALTER TABLE securetag.finding ALTER COLUMN cve TYPE TEXT;
ALTER TABLE securetag.finding ALTER COLUMN severity TYPE VARCHAR(50);
ALTER TABLE securetag.finding ALTER COLUMN category TYPE VARCHAR(100);
