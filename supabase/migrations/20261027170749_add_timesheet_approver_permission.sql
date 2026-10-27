/*
# Add "Timesheet Approver" permission to Project Security

## Purpose
Introduces a new project-level permission key `timesheet.approve` that controls who can
approve or reject timesheet submissions for projects in their tenant. Managed in the
Project Security matrix alongside the existing project.* permissions.

## Changes
- Seeds `project_role_permissions` rows for the `timesheet.approve` permission key for
  each system role:
  - Administrators, Portfolio Managers, Project Manager, Team Leads, Resource Manager: true
  - Portfolio Viewers, Team Member: false

## Security
- No new tables. Existing RLS policies on project_role_permissions already cover the new rows.
*/

INSERT INTO project_role_permissions (role_name, permission_key, can_execute, tenant_name)
VALUES
  ('Administrators', 'timesheet.approve', true, NULL),
  ('Portfolio Managers', 'timesheet.approve', true, NULL),
  ('Project Manager', 'timesheet.approve', true, NULL),
  ('Team Leads', 'timesheet.approve', true, NULL),
  ('Resource Manager', 'timesheet.approve', true, NULL),
  ('Portfolio Viewers', 'timesheet.approve', false, NULL),
  ('Team Member', 'timesheet.approve', false, NULL)
ON CONFLICT DO NOTHING;
