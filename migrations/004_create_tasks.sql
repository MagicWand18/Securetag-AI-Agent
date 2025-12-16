--liquibase formatted sql
--changeset securetag:004_create_tasks
-- Migration 004: Create Task and Result Tables
-- Created based on code inference from src/server/index.ts and src/worker/TaskExecutor.ts

-- Task Table
CREATE TABLE IF NOT EXISTS securetag.task (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payload_json JSONB DEFAULT '{}',
    retries INT DEFAULT 0,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_task_tenant_status ON securetag.task(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_task_created_at ON securetag.task(created_at);

-- Tool Execution Table
CREATE TABLE IF NOT EXISTS securetag.tool_execution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES securetag.task(id) ON DELETE CASCADE,
    tool VARCHAR(50) NOT NULL,
    args_json JSONB,
    exit_code INT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    stdout_ref TEXT,
    stderr_ref TEXT,
    metrics_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_exec_task ON securetag.tool_execution(task_id);

-- Finding Table
CREATE TABLE IF NOT EXISTS securetag.finding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES securetag.task(id) ON DELETE CASCADE,
    source_tool VARCHAR(50) NOT NULL,
    rule_id TEXT,
    rule_name TEXT,
    severity VARCHAR(20),
    category VARCHAR(50),
    cwe VARCHAR(20),
    cve VARCHAR(20),
    file_path TEXT,
    line INT,
    fingerprint TEXT,
    evidence_ref TEXT,
    analysis_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finding_task ON securetag.finding(task_id);
CREATE INDEX IF NOT EXISTS idx_finding_severity ON securetag.finding(severity);

-- Scan Result Table
CREATE TABLE IF NOT EXISTS securetag.scan_result (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES securetag.task(id) ON DELETE CASCADE,
    summary_json JSONB,
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_scan_result_task UNIQUE (task_id)
);
