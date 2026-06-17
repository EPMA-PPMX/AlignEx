-- Drop the FK constraint that ties user_dashboard_widgets to the old users table
-- user_licenses.id is now the canonical user ID and is not in the users table
ALTER TABLE user_dashboard_widgets DROP CONSTRAINT IF EXISTS user_dashboard_widgets_user_id_fkey;

-- Delete duplicate resource record created in error (real one is b26c84d4 which has email + is used in tasks)
DELETE FROM resources WHERE id = '796f5889-ec36-4278-87e4-32cd42a9855f';

-- Seed default widgets for the current license user (e0322539-2fca-463e-8191-34efcec1fb5a)
-- Only insert if not already present
INSERT INTO user_dashboard_widgets (user_id, widget_type, is_enabled, position_order, size, settings)
SELECT 'e0322539-2fca-463e-8191-34efcec1fb5a', widget_type, is_enabled, position_order, size, settings
FROM (VALUES
  ('team_capacity',      true,  1,  'medium', '{}'::jsonb),
  ('my_projects',        true,  2,  'medium', '{}'::jsonb),
  ('my_risks',           true,  3,  'small',  '{}'::jsonb),
  ('my_issues',          true,  4,  'small',  '{}'::jsonb),
  ('my_tasks',           true,  5,  'small',  '{}'::jsonb),
  ('personal_goals',     true,  6,  'small',  '{}'::jsonb),
  ('pending_approvals',  true,  7,  'small',  '{}'::jsonb),
  ('deadlines',          false, 8,  'small',  '{}'::jsonb),
  ('timesheet_quick',    true,  9,  'small',  '{}'::jsonb),
  ('recent_activity',    false, 10, 'medium', '{}'::jsonb),
  ('project_health',     false, 11, 'medium', '{}'::jsonb),
  ('my_change_requests', true,  12, 'medium', '{}'::jsonb)
) AS v(widget_type, is_enabled, position_order, size, settings)
WHERE NOT EXISTS (
  SELECT 1 FROM user_dashboard_widgets
  WHERE user_id = 'e0322539-2fca-463e-8191-34efcec1fb5a'
);
