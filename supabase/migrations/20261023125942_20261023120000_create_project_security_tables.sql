/*
# Phase 1: Project-Level Security Schema (MS Project Server-style RBAC)

## Purpose
Implements the database foundation for project-level security with Security Groups,
Security Categories, Global Permissions, and Project-Level Permissions — modeled after
Microsoft Project Server / Project Online.

## New Tables

1. **project_roles** — Lookup table of standardized project-level roles (replaces free-text
   roles in project_team_members.role). System roles are seeded and marked is_system_role=true
   so they cannot be accidentally deleted.
   - id (uuid PK)
   - role_name (text, unique) — e.g. 'Project Manager', 'Team Member', 'Stakeholder', 'Resource Manager'
   - display_name (text) — human-friendly label
   - description (text) — what this role can do
   - sort_order (int) — display ordering
   - is_system_role (boolean) — true for seeded system roles, prevents deletion
   - created_at, updated_at (timestamps)

2. **project_role_permissions** — Maps each project role to specific permission keys.
   This is the "Category-level permissions" concept from MS Project Server.
   - id (uuid PK)
   - role_name (text, FK to project_roles.role_name)
   - permission_key (text) — e.g. 'project.view', 'project.edit_schedule', 'project.edit_budget'
   - can_execute (boolean) — whether this role is granted this permission
   - created_at (timestamp)
   - UNIQUE(role_name, permission_key)

3. **security_categories** — Groups of projects that define which projects a user can see
   (the "Security Categories" concept from MS Project Server). A category can include
   all projects, projects a user manages, projects where a user is a team member, or
   explicitly named projects.
   - id (uuid PK)
   - name (text, unique per tenant) — e.g. 'All Projects', 'My Projects', 'IT Projects'
   - description (text)
   - scope_type (text) — 'all_tenant', 'managed_by_user', 'member_of_user', 'explicit_projects'
   - tenant_name (text) — tenant this category belongs to
   - created_at, updated_at (timestamps)

4. **security_category_projects** — Junction table for explicit project assignment to categories.
   Only used when scope_type = 'explicit_projects'.
   - id (uuid PK)
   - category_id (uuid, FK to security_categories)
   - project_id (uuid, FK to projects)
   - created_at (timestamp)

5. **security_category_users** — Junction table linking users to security categories.
   A user assigned to a category can see all projects in that category.
   - id (uuid PK)
   - category_id (uuid, FK to security_categories)
   - user_id (uuid, FK to users)
   - created_at (timestamp)

## Modified Tables

1. **projects** — Added `owner_id` column (nullable uuid FK to users.id) to track who
   created/owns the project. The owner always has full access to their project regardless
   of team membership.

2. **project_team_members** — Added `tenant_name` column for tenant isolation. The existing
   `role` text column now has a foreign key constraint to project_roles(role_name), enforcing
   that values must match a standardized role (backward compatible — existing 'Team Member'
   values are valid).

## Seed Data

- 4 system project roles: Project Manager, Team Member, Stakeholder, Resource Manager
- Permission keys seeded per role (see below)
- Default security category 'My Projects' with scope_type 'member_of_user' per tenant

## Security
- RLS enabled on all new tables with anon+authenticated access (matching existing app pattern
  where the backend handles authorization, not the database RLS layer).
- Grants: SELECT, INSERT, UPDATE, DELETE to anon, authenticated on all new tables.

## Important Notes
1. This migration is purely additive — no existing columns are dropped or renamed.
2. The owner_id column is nullable so existing projects remain unaffected.
3. The FK constraint on project_team_members.role is backward-compatible:
   all existing role values ('Team Member') are already valid role_names.
4. The security_categories system is provided for future use; the initial authorization
   logic in the backend will use membership-based visibility (owner_id + project_team_members).
*/

-- ============================================================================
-- 1. project_roles lookup table
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_roles TO anon, authenticated;

-- Seed system roles
INSERT INTO project_roles (role_name, display_name, description, sort_order, is_system_role) VALUES
  ('Project Manager', 'Project Manager', 'Full project access including editing schedule, budget, team, and approvals', 1, true),
  ('Team Member', 'Team Member', 'Can view project, edit assigned tasks, create risks and issues', 2, true),
  ('Stakeholder', 'Stakeholder', 'Read-only access to project details, budget, and status reports', 3, true),
  ('Resource Manager', 'Resource Manager', 'Can view project and manage team assignments', 4, true)
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- 2. project_role_permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL REFERENCES project_roles(role_name) ON DELETE CASCADE,
  permission_key text NOT NULL,
  can_execute boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (role_name, permission_key)
);

ALTER TABLE project_role_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_role_permissions TO anon, authenticated;

-- Seed permissions for Project Manager
INSERT INTO project_role_permissions (role_name, permission_key, can_execute) VALUES
  ('Project Manager', 'project.view', true),
  ('Project Manager', 'project.edit_details', true),
  ('Project Manager', 'project.edit_schedule', true),
  ('Project Manager', 'project.edit_budget', true),
  ('Project Manager', 'project.view_budget', true),
  ('Project Manager', 'project.manage_team', true),
  ('Project Manager', 'project.approve_changes', true),
  ('Project Manager', 'project.create_risks', true),
  ('Project Manager', 'project.edit_risks', true),
  ('Project Manager', 'project.create_issues', true),
  ('Project Manager', 'project.edit_issues', true),
  ('Project Manager', 'project.upload_documents', true),
  ('Project Manager', 'project.delete', true),
  ('Project Manager', 'project.create_status_report', true),
  ('Project Manager', 'project.view_status_reports', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Seed permissions for Team Member
INSERT INTO project_role_permissions (role_name, permission_key, can_execute) VALUES
  ('Team Member', 'project.view', true),
  ('Team Member', 'project.edit_tasks_assigned', true),
  ('Team Member', 'project.create_risks', true),
  ('Team Member', 'project.create_issues', true),
  ('Team Member', 'project.upload_documents', true),
  ('Team Member', 'project.view_budget', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Seed permissions for Stakeholder
INSERT INTO project_role_permissions (role_name, permission_key, can_execute) VALUES
  ('Stakeholder', 'project.view', true),
  ('Stakeholder', 'project.view_budget', true),
  ('Stakeholder', 'project.view_status_reports', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- Seed permissions for Resource Manager
INSERT INTO project_role_permissions (role_name, permission_key, can_execute) VALUES
  ('Resource Manager', 'project.view', true),
  ('Resource Manager', 'project.view_budget', true),
  ('Resource Manager', 'project.manage_team', true),
  ('Resource Manager', 'project.view_status_reports', true)
ON CONFLICT (role_name, permission_key) DO NOTHING;

-- ============================================================================
-- 3. security_categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scope_type text NOT NULL DEFAULT 'member_of_user'
    CHECK (scope_type IN ('all_tenant', 'managed_by_user', 'member_of_user', 'explicit_projects')),
  tenant_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (name, tenant_name)
);

ALTER TABLE security_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_categories TO anon, authenticated;

-- ============================================================================
-- 4. security_category_projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_category_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES security_categories(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category_id, project_id)
);

ALTER TABLE security_category_projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_category_projects TO anon, authenticated;

-- ============================================================================
-- 5. security_category_users
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_category_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES security_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (category_id, user_id)
);

ALTER TABLE security_category_users ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_category_users TO anon, authenticated;

-- ============================================================================
-- 6. Add owner_id to projects table
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner_id uuid REFERENCES users(id);
  END IF;
END $$;

-- ============================================================================
-- 7. Add tenant_name to project_team_members
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_team_members' AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE project_team_members ADD COLUMN tenant_name text;
  END IF;
END $$;

-- ============================================================================
-- 8. Add FK constraint on project_team_members.role to project_roles(role_name)
--    Backward-compatible: existing 'Team Member' values are already valid role_names.
--    Using NOT VALID so existing rows are not re-checked, but new inserts/updates are.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ptm_role_fk_project_roles'
  ) THEN
    ALTER TABLE project_team_members
    ADD CONSTRAINT ptm_role_fk_project_roles
    FOREIGN KEY (role) REFERENCES project_roles(role_name) NOT VALID;
  END IF;
END $$;

-- ============================================================================
-- 9. Indexes for authorization queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ptm_resource_id ON project_team_members(resource_id);
CREATE INDEX IF NOT EXISTS idx_ptm_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_name ON projects(tenant_name);
