-- Add "Approve Project Requests" permission to the Project Security matrix.
-- This permission gates who can approve/reject project initiation requests.

-- Seed default permissions for system roles that should always have it.
INSERT INTO project_role_permissions (role_name, permission_key, can_execute, tenant_name)
VALUES
  ('Administrators', 'project.approve_request', true, NULL),
  ('Portfolio Managers', 'project.approve_request', true, NULL)
ON CONFLICT DO NOTHING;
