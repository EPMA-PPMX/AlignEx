/*
# Expand valid_system_role constraint to include new account roles

## Summary
The `users.system_role` column has a CHECK constraint (`valid_system_role`)
that only allows the four original values: Team Member, Project Manager,
Portfolio Manager, Admin. The new PPMX account-role catalog adds seven new
values. This migration drops and recreates the constraint to accept both
the legacy and the new role names so admins can assign the new account roles
from the User Management screen.

## Changes
- Drop `valid_system_role` constraint on `users`.
- Recreate it with the expanded allow-list:
  Administrators, Portfolio Managers, Portfolio Viewers, Project Managers,
  Resource Managers, Team Leads, Team Members (new)
  plus the legacy Admin, Portfolio Manager, Project Manager, Team Member
  (kept for backward compatibility with existing rows).

## Data safety
- No column types changed, no rows deleted. Existing users keep their
  current system_role values; all current values remain valid under the new
  constraint.
*/

ALTER TABLE users DROP CONSTRAINT IF EXISTS valid_system_role;

ALTER TABLE users ADD CONSTRAINT valid_system_role
  CHECK (system_role = ANY (ARRAY[
    'Team Members',
    'Team Leads',
    'Project Managers',
    'Resource Managers',
    'Portfolio Managers',
    'Portfolio Viewers',
    'Administrators',
    'Team Member',
    'Project Manager',
    'Portfolio Manager',
    'Admin'
  ]::text[]));
