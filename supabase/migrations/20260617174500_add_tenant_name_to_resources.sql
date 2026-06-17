ALTER TABLE resources ADD COLUMN IF NOT EXISTS tenant_name text;

CREATE INDEX IF NOT EXISTS idx_resources_tenant_name ON resources(tenant_name);