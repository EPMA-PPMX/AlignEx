-- Add "Create Project Requests" permission to the Project Security matrix.
-- Seed default permissions for system roles that should have it.
INSERT INTO project_role_permissions (role_name, permission_key, can_execute, tenant_name)
VALUES
  ('Administrators', 'project.create_request', true, NULL),
  ('Portfolio Managers', 'project.create_request', true, NULL),
  ('Project Manager', 'project.create_request', true, NULL),
  ('Team Member', 'project.create_request', true, NULL),
  ('Team Leads', 'project.create_request', true, NULL),
  ('Portfolio Viewers', 'project.create_request', false, NULL),
  ('Resource Manager', 'project.create_request', false, NULL)
ON CONFLICT DO NOTHING;
