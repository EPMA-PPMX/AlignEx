/*
# Add "View All Projects" project permission

Plain-English summary
Project visibility used to be decided by hardcoded role names in the app code.
It is now controlled from the Project Security tab. This migration adds a new
permission, "project.view_all", and turns it on for the roles that previously
saw every project (Administrators, Portfolio Managers, Portfolio Viewers).

1. Modified data
- `project_role_permissions`: new global rows (tenant_name IS NULL) for
  permission_key 'project.view_all' with can_execute = true for:
  - Administrators
  - Portfolio Managers
  - Portfolio Viewers

2. Security
- No table, column, RLS, or grant changes.

3. Important notes
- Rows are only inserted when they do not already exist, so re-running is safe.
- Any other role can be granted the permission from the Project Security tab.
- Existing permission rows are not modified.
*/

INSERT INTO project_role_permissions (role_name, permission_key, can_execute, tenant_name)
SELECT r.role_name, 'project.view_all', true, NULL
FROM (VALUES ('Administrators'), ('Portfolio Managers'), ('Portfolio Viewers')) AS r(role_name)
WHERE NOT EXISTS (
  SELECT 1 FROM project_role_permissions p
  WHERE p.role_name = r.role_name
    AND p.permission_key = 'project.view_all'
    AND p.tenant_name IS NULL
);
