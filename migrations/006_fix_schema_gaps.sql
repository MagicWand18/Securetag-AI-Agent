-- Add missing columns expected by the worker
ALTER TABLE securetag.tenant ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE securetag.task ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION securetag.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_task_updated_at ON securetag.task;
CREATE TRIGGER update_task_updated_at
    BEFORE UPDATE ON securetag.task
    FOR EACH ROW
    EXECUTE FUNCTION securetag.update_updated_at_column();
