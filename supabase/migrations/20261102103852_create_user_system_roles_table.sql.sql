/*
# Allow users to hold multiple system roles

Plain-English summary
Until now each user had exactly one role. This migration adds a link table so a
single user can hold several roles (for example Project Manager and Resource
Manager). Permissions are the combined set of every role the user holds.
The existing single-role column on users is kept and holds the user's primary role.

1. New tables
- `user_system_roles`
  - `user_id` (uuid, references users.id, cascades on delete)
  - `role_name` (text, references project_roles.role_name, cascades on update and delete)
  - `created_at` (timestamptz, default now())
  - Primary key on (user_id, role_name) so a role can only be assigned once per user

2. Modified data
- Every existing user's current role is copied into `user_system_roles` so nobody
  loses access. The users.system_role column is not changed.

3. Security
- Row level security is enabled on `user_system_roles`.
- Grants: SELECT, INSERT, UPDATE, DELETE to `anon` and `authenticated`, matching
  the other project security tables. The app has no sign-in, so the anon key is
  what reads and writes this table.
- Four separate policies (select, insert, update, delete) allow access to the
  table, since it holds no private data and mirrors the existing role tables.

4. Important notes
- The migration is safe to re-run: the table, index, policies and backfill are
  all idempotent.
- No columns are dropped or changed.
*/

CREATE TABLE IF NOT EXISTS user_system_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES project_roles(role_name) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_name)
);

CREATE INDEX IF NOT EXISTS user_system_roles_role_name_idx ON user_system_roles (role_name);

ALTER TABLE user_system_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_system_roles TO anon, authenticated;

DROP POLICY IF EXISTS "select_user_system_roles" ON user_system_roles;
CREATE POLICY "select_user_system_roles" ON user_system_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_user_system_roles" ON user_system_roles;
CREATE POLICY "insert_user_system_roles" ON user_system_roles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_user_system_roles" ON user_system_roles;
CREATE POLICY "update_user_system_roles" ON user_system_roles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_user_system_roles" ON user_system_roles;
CREATE POLICY "delete_user_system_roles" ON user_system_roles FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO user_system_roles (user_id, role_name)
SELECT id, system_role
FROM users
WHERE system_role IS NOT NULL
ON CONFLICT (user_id, role_name) DO NOTHING;
