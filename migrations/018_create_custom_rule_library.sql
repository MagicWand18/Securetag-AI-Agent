-- Create table for storing custom generated rules
CREATE TABLE IF NOT EXISTS securetag.custom_rule_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL REFERENCES securetag.tenant(id),
    rule_content TEXT NOT NULL,
    stack_context JSONB DEFAULT '{}',
    ai_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookup by tenant
CREATE INDEX IF NOT EXISTS idx_custom_rule_library_tenant ON securetag.custom_rule_library(tenant_id);

-- Add configuration column to task table
ALTER TABLE securetag.task 
ADD COLUMN IF NOT EXISTS custom_rules_config JSONB DEFAULT NULL;
