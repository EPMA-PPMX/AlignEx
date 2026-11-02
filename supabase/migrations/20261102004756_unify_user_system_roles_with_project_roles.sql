ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_system_role;

UPDATE users
SET system_role = CASE system_role
  WHEN 'Team Members' THEN 'Team Member'
  WHEN 'Project Managers' THEN 'Project Manager'
  WHEN 'Resource Managers' THEN 'Resource Manager'
  WHEN 'Admin' THEN 'Administrators'
END
WHERE system_role IN ('Team Members', 'Project Managers', 'Resource Managers', 'Admin');

ALTER TABLE users
  ADD CONSTRAINT users_system_role_fkey
  FOREIGN KEY (system_role) REFERENCES project_roles(role_name)
  ON UPDATE CASCADE ON DELETE RESTRICT;
