/*
# Update project_roles with full PPMX role set

## Summary
Replace the four original project roles (Project Manager, Team Member,
Stakeholder, Resource Manager) with the complete PPMX role catalog requested
by the product owner. The original "Project Manager" and "Team Member" rows
are KEPT (renamed display only) because existing project_team_members rows
reference them via foreign key and code defaults to 'Team Member'. The new
roles are added alongside, and the legacy roles that are no longer in the
target set (Stakeholder, Resource Manager) are kept but marked
is_system_role = false so admins can retire them when ready.

## Final role catalog (sort_order)
1. Administrators       — Full access to Project Server configuration and security
2. Portfolio Managers   — Manage and analyze projects across portfolios
3. Portfolio Viewers    — View portfolio and project information
4. Project Managers     — Create, manage, and publish authorized projects
5. Resource Managers    — Manage enterprise resources and resource assignments
6. Team Leads           — Oversee team members and their assignments
7. Team Members         — View and update assigned tasks and timesheets, subject to permissions

## Data safety
- No existing project_team_members or project_team_member_roles rows are
  deleted or rewritten. The legacy 'Project Manager' and 'Team Member'
  role_name values remain valid foreign key targets.
- Stakeholder and Resource Manager are retained (not dropped) to avoid
  orphaning any historical assignments; they are simply no longer marked as
  system roles and are sorted to the bottom so the new roles surface first.
- Default permission rows are inserted for each NEW role based on the
  descriptions above, using the existing permission_key vocabulary. Existing
  permission rows for legacy roles are untouched.

## Security
- No RLS policy changes. project_roles is already readable/writable by the
  anon/authenticated roles per existing migrations.
*/

-- ---------------------------------------------------------------------------
-- 1. Insert / update the new role catalog (idempotent upsert on role_name)
-- ---------------------------------------------------------------------------
INSERT INTO project_roles (role_name, display_name, description, sort_order, is_system_role)
VALUES
  ('Administrators',      'Administrators',      'Full access to Project Server configuration and security', 1, true),
  ('Portfolio Managers',  'Portfolio Managers',  'Manage and analyze projects across portfolios',           2, true),
  ('Portfolio Viewers',   'Portfolio Viewers',   'View portfolio and project information',                 3, true),
  ('Project Managers',    'Project Managers',    'Create, manage, and publish authorized projects',        4, true),
  ('Resource Managers',   'Resource Managers',   'Manage enterprise resources and resource assignments',   5, true),
  ('Team Leads',          'Team Leads',          'Oversee team members and their assignments',             6, true),
  ('Team Members',        'Team Members',        'View and update assigned tasks and timesheets, subject to permissions', 7, true)
ON CONFLICT (role_name) DO UPDATE
SET display_name  = EXCLUDED.display_name,
    description   = EXCLUDED.description,
    sort_order    = EXCLUDED.sort_order,
    is_system_role = EXCLUDED.is_system_role,
    updated_at    = now();

-- ---------------------------------------------------------------------------
-- 2. Demote legacy roles that are no longer in the target catalog
--    (keep the rows so existing FK references stay valid, but stop showing
--     them as system roles and push them to the bottom of the list)
-- ---------------------------------------------------------------------------
UPDATE project_roles
SET is_system_role = false, sort_order = 100, updated_at = now()
WHERE role_name IN ('Stakeholder', 'Resource Manager');

-- Keep the two legacy rows that existing code/data still reference, but
-- align their sort order with their new counterparts so the UI lists them
-- sensibly. We do NOT rename role_name (that would break FKs); we only
-- refresh display_name + description.
UPDATE project_roles
SET display_name = 'Project Manager (legacy)',
    description  = 'Legacy single-role assignment. Prefer "Project Managers".',
    sort_order   = 50,
    updated_at   = now()
WHERE role_name = 'Project Manager';

UPDATE project_roles
SET display_name = 'Team Member (legacy)',
    description  = 'Legacy single-role assignment. Prefer "Team Members".',
    sort_order   = 51,
    updated_at   = now()
WHERE role_name = 'Team Member';

-- ---------------------------------------------------------------------------
-- 3. Default permissions for each NEW role
--    Using the existing permission_key vocabulary. Idempotent: only inserts
--    rows that do not already exist for that (role_name, permission_key).
-- ---------------------------------------------------------------------------
-- Administrators: every permission
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Administrators', k, true
FROM (VALUES
  ('project.view'), ('project.edit_details'), ('project.edit_schedule'),
  ('project.edit_budget'), ('project.view_budget'), ('project.manage_team'),
  ('project.approve_changes'), ('project.create_risks'), ('project.edit_risks'),
  ('project.create_issues'), ('project.edit_issues'), ('project.upload_documents'),
  ('project.delete'), ('project.create_status_report'), ('project.view_status_reports'),
  ('project.edit_tasks_assigned')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Administrators' AND p.permission_key = v.k
);

-- Portfolio Managers: full project management across portfolios
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Portfolio Managers', k, true
FROM (VALUES
  ('project.view'), ('project.edit_details'), ('project.edit_schedule'),
  ('project.edit_budget'), ('project.view_budget'), ('project.manage_team'),
  ('project.approve_changes'), ('project.create_risks'), ('project.edit_risks'),
  ('project.create_issues'), ('project.edit_issues'), ('project.upload_documents'),
  ('project.create_status_report'), ('project.view_status_reports'),
  ('project.edit_tasks_assigned')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Portfolio Managers' AND p.permission_key = v.k
);

-- Portfolio Viewers: read-only across portfolios
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Portfolio Viewers', k, true
FROM (VALUES
  ('project.view'), ('project.view_budget'), ('project.view_status_reports')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Portfolio Viewers' AND p.permission_key = v.k
);

-- Project Managers: create/manage/publish projects
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Project Managers', k, true
FROM (VALUES
  ('project.view'), ('project.edit_details'), ('project.edit_schedule'),
  ('project.edit_budget'), ('project.view_budget'), ('project.manage_team'),
  ('project.approve_changes'), ('project.create_risks'), ('project.edit_risks'),
  ('project.create_issues'), ('project.edit_issues'), ('project.upload_documents'),
  ('project.create_status_report'), ('project.view_status_reports'),
  ('project.edit_tasks_assigned')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Project Managers' AND p.permission_key = v.k
);

-- Resource Managers: manage resources and assignments
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Resource Managers', k, true
FROM (VALUES
  ('project.view'), ('project.view_budget'), ('project.manage_team'),
  ('project.edit_schedule'), ('project.edit_tasks_assigned'),
  ('project.view_status_reports')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Resource Managers' AND p.permission_key = v.k
);

-- Team Leads: oversee team members and assignments
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Team Leads', k, true
FROM (VALUES
  ('project.view'), ('project.view_budget'), ('project.manage_team'),
  ('project.edit_schedule'), ('project.edit_tasks_assigned'),
  ('project.create_issues'), ('project.edit_issues'),
  ('project.create_status_report'), ('project.view_status_reports')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Team Leads' AND p.permission_key = v.k
);

-- Team Members: view and update assigned tasks/timesheets
INSERT INTO project_role_permissions (role_name, permission_key, can_execute)
SELECT 'Team Members', k, true
FROM (VALUES
  ('project.view'), ('project.edit_tasks_assigned'),
  ('project.view_status_reports')
) AS v(k)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = 'Team Members' AND p.permission_key = v.k
);
