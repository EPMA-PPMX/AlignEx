/*
  # Add 'Admin' to valid_system_role constraint on users table

  Updates the check constraint to include 'Admin' as a valid system role.
*/

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_system_role;

ALTER TABLE public.users ADD CONSTRAINT valid_system_role
  CHECK (system_role IN ('Team Member', 'Project Manager', 'Portfolio Manager', 'Admin'));
