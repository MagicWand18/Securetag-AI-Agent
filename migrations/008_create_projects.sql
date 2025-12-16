--liquibase formatted sql
--changeset securetag:008_create_projects
-- Migration 008: Create Project Entity and Link Tasks
-- Context: Allows grouping scans under a persistent project identity with an optional human-readable alias.

-- 0. Fix missing schema gaps detected in live DB
ALTER TABLE securetag.api_key ADD COLUMN IF NOT EXISTS scopes JSONB DEFAULT '[]';

-- 1. Create Project Table
CREATE TABLE IF NOT EXISTS securetag.project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    alias TEXT,
    name TEXT, -- Optional descriptive name
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Unique Index on Alias per Tenant
-- This ensures that 'backend-api' can be used by Tenant A and Tenant B independently,
-- but Tenant A cannot have two projects with the same alias.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_alias_tenant ON securetag.project(tenant_id, alias) WHERE alias IS NOT NULL;

-- 3. Link Tasks to Projects
ALTER TABLE securetag.task 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES securetag.project(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_project ON securetag.task(project_id);

-- 4. Add "is_retest" logic support
ALTER TABLE securetag.task
ADD COLUMN IF NOT EXISTS previous_task_id UUID REFERENCES securetag.task(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_retest BOOLEAN DEFAULT false;
