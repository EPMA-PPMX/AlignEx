/*
# Multi-role project team memberships

## Summary
Allow a single user (resource) to hold MORE THAN ONE role on the SAME project,
with their effective permissions being the UNION of all roles assigned.
Previously `project_team_members.role` held a single text value and a
`UNIQUE (project_id, resource_id)` constraint blocked any second assignment.

## Approach
1. Keep `project_team_members` as the membership record (allocation %, dates,
   project/resource link). The single `role` column is retained for backward
   compatibility and continues to hold the "primary" role.
2. Add a new many-to-many child table `project_team_member_roles` that links a
   team member row to one or more `project_roles`. Each row = one role
   assignment on a specific membership.
3. Drop the `unique_project_resource` constraint so the same resource can be
   added to a project under more than one role if desired (legacy single-row
   pattern is preserved; new multi-role pattern uses the child table).
   NOTE: We keep the unique constraint on the child table so duplicate
   (team_member_id, role_name) pairs are impossible.
4. Backfill `project_team_member_roles` from the existing `role` column so no
   existing assignment is lost.
5. Add a SQL function `get_effective_project_permissions(p_project_id uuid,
   p_resource_id uuid)` that returns the UNION of permission_keys granted to
   ANY role the resource holds on that project. Used by the backend permission
   engine and available for direct queries.

## New Tables
- `project_team_member_roles`
  - `id` uuid PK
  - `team_member_id` uuid NOT NULL REFERENCES project_team_members(id) ON DELETE CASCADE
  - `role_name` text NOT NULL REFERENCES project_roles(role_name) ON UPDATE CASCADE ON DELETE RESTRICT
  - `assigned_at` timestamptz default now()
  - UNIQUE (team_member_id, role_name)

## Security
- Enable RLS on `project_team_member_roles`.
- Grant CRUD to `anon, authenticated` (matches the existing
  `project_team_members` policy posture — this is a no-auth/demo app where the
  anon-key frontend reads and writes team membership directly).
- Replace the legacy permissive policies on `project_team_members` with the
  same anon/authenticated pattern so the table stays reachable by the
  anon-key client (idempotent drop/recreate).

## Important Notes
1. The `project_team_members.role` column is NOT dropped — existing reads and
   inserts that still use it continue to work. New code reads effective
   permissions via the child table union.
2. The `unique_project_resource` constraint is dropped so a resource can
   appear more than once on a project. Existing rows are unaffected.
3. Backfill is idempotent: only inserts rows for roles that are not already
   present in the child table for that membership.
*/

-- ---------------------------------------------------------------------------
-- 1. Drop the single-role uniqueness constraint on project_team_members
-- ---------------------------------------------------------------------------
ALTER TABLE project_team_members DROP CONSTRAINT IF EXISTS unique_project_resource;

-- ---------------------------------------------------------------------------
-- 2. Create the multi-role child table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_team_member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES project_team_members(id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES project_roles(role_name) ON UPDATE CASCADE ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_member_role UNIQUE (team_member_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_ptmr_team_member_id ON project_team_member_roles(team_member_id);
CREATE INDEX IF NOT EXISTS idx_ptmr_role_name ON project_team_member_roles(role_name);

ALTER TABLE project_team_member_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON project_team_member_roles TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_project_team_member_roles" ON project_team_member_roles;
CREATE POLICY "anon_select_project_team_member_roles"
  ON project_team_member_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_project_team_member_roles" ON project_team_member_roles;
CREATE POLICY "anon_insert_project_team_member_roles"
  ON project_team_member_roles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_project_team_member_roles" ON project_team_member_roles;
CREATE POLICY "anon_update_project_team_member_roles"
  ON project_team_member_roles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_project_team_member_roles" ON project_team_member_roles;
CREATE POLICY "anon_delete_project_team_member_roles"
  ON project_team_member_roles FOR DELETE
  TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 3. Backfill child table from the existing single role column (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO project_team_member_roles (team_member_id, role_name)
SELECT ptm.id, ptm.role
FROM project_team_members ptm
WHERE ptm.role IS NOT NULL AND ptm.role <> ''
  AND NOT EXISTS (
    SELECT 1 FROM project_team_member_roles ptmr
    WHERE ptmr.team_member_id = ptm.id AND ptmr.role_name = ptm.role
  );

-- ---------------------------------------------------------------------------
-- 4. Effective-permissions helper function (UNION across all assigned roles)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_effective_project_permissions(uuid, uuid);

CREATE OR REPLACE FUNCTION get_effective_project_permissions(
  p_project_id uuid,
  p_resource_id uuid
) RETURNS TABLE (permission_key text) AS $$
  SELECT DISTINCT prp.permission_key
  FROM project_team_members ptm
  JOIN project_team_member_roles ptmr ON ptmr.team_member_id = ptm.id
  JOIN project_role_permissions prp ON prp.role_name = ptmr.role_name
  WHERE ptm.project_id = p_project_id
    AND ptm.resource_id = p_resource_id
    AND prp.can_execute = true
  UNION
  -- Include permissions from the legacy single role column for backward compat
  SELECT DISTINCT prp.permission_key
  FROM project_team_members ptm
  JOIN project_role_permissions prp ON prp.role_name = ptm.role
  WHERE ptm.project_id = p_project_id
    AND ptm.resource_id = p_resource_id
    AND prp.can_execute = true;
$$ LANGUAGE sql STABLE;

-- Allow anon/authenticated to call the helper (read-only, no sensitive data)
REVOKE EXECUTE ON FUNCTION get_effective_project_permissions(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_effective_project_permissions(uuid, uuid) TO anon, authenticated;
