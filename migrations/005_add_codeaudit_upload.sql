--liquibase formatted sql
--changeset securetag:005_add_codeaudit_upload

CREATE TABLE IF NOT EXISTS securetag.codeaudit_upload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES securetag.tenant(id),
    project_id UUID, -- Nullable for ad-hoc uploads
    task_id UUID NOT NULL REFERENCES securetag.task(id),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
