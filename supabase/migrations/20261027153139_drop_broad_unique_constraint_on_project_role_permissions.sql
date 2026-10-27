-- Drop the overly-broad unique constraint that prevents tenant-specific
-- permission overrides from coexisting with global defaults.
-- The partial unique indexes uq_prp_system_role_perm and uq_prp_tenant_role_perm
-- already enforce uniqueness correctly for global and tenant-scoped rows respectively.

ALTER TABLE project_role_permissions
  DROP CONSTRAINT IF EXISTS project_role_permissions_role_name_permission_key_key;
