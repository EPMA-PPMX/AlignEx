/*
# Add tenant_name to project_roles and project_role_permissions

## Purpose
Makes project security roles organization-specific so each organization (tenant)
can manage its own custom security roles independently. Built-in system roles
remain shared across all organizations (tenant_name = NULL); any custom role an
admin creates is scoped to their organization.

## Changes

1. **project_roles** — Added `tenant_name` column (nullable text).
   - NULL means the role is a global/system role available to every organization.
   - A non-null value means the role is custom and belongs to that tenant only.
   - Added a partial unique index so role_name stays globally unique for system
     roles (tenant_name IS NULL) but allows each tenant to reuse a role_name that
     another tenant also uses (tenant_name IS NOT NULL). System role names remain
     globally reserved so the FK from project_team_members.role keeps working.
   - Added a btree index on tenant_name for fast per-tenant filtering.

2. **project_role_permissions** — Added `tenant_name` column (nullable text).
   - Mirrors the project_roles tenancy: NULL = global permission mapping,
     non-null = tenant-specific override.
   - Added a partial unique index so the (role_name, permission_key) pair is
     unique per tenant, and a tenant_name index for filtering.

3. **Backfill** — Existing rows get tenant_name = NULL (they are the seeded
   system roles and their permission mappings), which is the correct value.

## Security
- RLS already enabled on both tables with anon + authenticated CRUD. No policy
  changes needed — the existing `USING (true)` policies continue to allow access
  because authorization is enforced in the application layer (matching the rest
  of this project's pattern). The new columns are additive and do not restrict
  existing access.

## Important Notes
1. This migration is purely additive — no existing columns are dropped or
   renamed, so existing role data and the FK constraint on
   project_team_members.role are unaffected.
2. System roles (Project Manager, Team Member, Stakeholder, Resource Manager,
   and the additional catalog roles added in later migrations) keep
   tenant_name = NULL and remain visible to every organization.
3. When the frontend creates a custom role, it must set tenant_name to the
   current user's organization. The frontend filters the role list with
   `tenant_name IS NULL OR tenant_name = <current tenant>`.
*/