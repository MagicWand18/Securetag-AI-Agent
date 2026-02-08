--liquibase formatted sql

--changeset securetag:025_add_task_evolution_metrics
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS new_findings_count INTEGER DEFAULT 0;
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS fixed_findings_count INTEGER DEFAULT 0;
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS recurring_findings_count INTEGER DEFAULT 0;
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS net_risk_score INTEGER DEFAULT 0;
