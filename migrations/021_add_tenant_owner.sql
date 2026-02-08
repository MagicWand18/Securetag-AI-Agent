-- Add owner_user_id column to tenant table
ALTER TABLE securetag.tenant ADD COLUMN owner_user_id UUID;

-- Populate existing tenants with the oldest admin
UPDATE securetag.tenant t
SET owner_user_id = (
    SELECT id FROM securetag.app_user u
    WHERE u.tenant_id = t.id AND u.role = 'admin'
    ORDER BY u.created_at ASC
    LIMIT 1
);

-- Fallback: If no admin, pick the oldest user
UPDATE securetag.tenant t
SET owner_user_id = (
    SELECT id FROM securetag.app_user u
    WHERE u.tenant_id = t.id
    ORDER BY u.created_at ASC
    LIMIT 1
)
WHERE owner_user_id IS NULL;

-- Add foreign key constraint
ALTER TABLE securetag.tenant
ADD CONSTRAINT fk_tenant_owner
FOREIGN KEY (owner_user_id)
REFERENCES securetag.app_user(id);
