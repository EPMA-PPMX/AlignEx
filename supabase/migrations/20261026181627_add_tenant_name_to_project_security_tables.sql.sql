/*
# Add tenant_name to project_roles and project_role_permissions

## Purpose
Makes project security roles organization-specific so each organization (tenant)
can manage its own custom security roles independently. Built-in system roles
remain shared across all organizations (tenant_name = NULL); any custom role an
admin creates is scoped to their organization.

## Changes
1. project_roles — Added tenant_name (nullable text). NULL = global system role,
   non-null = tenant-scoped custom role. Partial unique indexes keep system
   role_name globally reserved while allowing tenants to reuse names among
   themselves. Btree index on tenant_name for filtering.
2. project_role_permissions — Added tenant_name (nullable text) mirroring
   project_roles. Partial unique index per tenant + tenant_name index.
3. Backfill — existing rows get tenant_name = NULL (seeded system roles).

## Security
RLS already enabled with anon + authenticated CRUD; no policy changes needed.

## Notes
Purely additive; no columns dropped/renamed. System roles stay tenant_name = NULL
and remain visible to every org. Frontend creates custom roles with the current
user's tenant_name and filters with `tenant_name IS NULL OR tenant_name = <t>`.
*/

-- 1. Add tenant_name to project_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_roles' AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE project_roles ADD COLUMN tenant_name text;
  END IF;
END $$;

-- Index for per-tenant filtering
CREATE INDEX IF NOT EXISTS idx_project_roles_tenant_name
  ON project_roles (tenant_name);

-- Keep system role names globally unique/reserved (tenant_name IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_roles_system_name
  ON project_roles (role_name)
  WHERE tenant_name IS NULL;

-- Allow each tenant to reuse role names among themselves, but not collide
-- with another tenant's custom role of the same name.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_roles_tenant_name
  ON project_roles (tenant_name, role_name)
  WHERE tenant_name IS NOT NULL;

-- 2. Add tenant_name to project_role_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_role_permissions' AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE project_role_permissions ADD COLUMN tenant_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_role_permissions_tenant_name
  ON project_role_permissions (tenant_name);

-- System permission mappings (tenant_name IS NULL) stay globally unique per role.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prp_system_role_perm
  ON project_role_permissions (role_name, permission_key)
  WHERE tenant_name IS NULL;

-- Tenant-specific permission mappings unique per (tenant, role, permission).
CREATE UNIQUE INDEX IF NOT EXISTS uq_prp_tenant_role_perm
  ON project_role_permissions (tenant_name, role_name, permission_key)
  WHERE tenant_name IS NOT NULL;

-- 3. Backfill: existing rows are seeded system roles/mappings -> NULL (already default).
UPDATE project_roles SET tenant_name = NULL WHERE tenant_name IS NULL;
UPDATE project_role_permissions SET tenant_name = NULL WHERE tenant_name IS NULL;