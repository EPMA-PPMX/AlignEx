-- Add RLS policies to project_roles, project_role_permissions, and security category tables
-- These tables need anon + authenticated access (matching the pattern used by all other tables in this project)

-- project_roles
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON project_roles TO anon, authenticated;

CREATE POLICY "Allow anonymous read access to project_roles"
  ON project_roles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access to project_roles"
  ON project_roles FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to project_roles"
  ON project_roles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to project_roles"
  ON project_roles FOR DELETE TO anon, authenticated USING (true);

-- project_role_permissions
ALTER TABLE project_role_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON project_role_permissions TO anon, authenticated;

CREATE POLICY "Allow anonymous read access to project_role_permissions"
  ON project_role_permissions FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access to project_role_permissions"
  ON project_role_permissions FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to project_role_permissions"
  ON project_role_permissions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to project_role_permissions"
  ON project_role_permissions FOR DELETE TO anon, authenticated USING (true);

-- security_categories
ALTER TABLE security_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON security_categories TO anon, authenticated;

CREATE POLICY "Allow anonymous read access to security_categories"
  ON security_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access to security_categories"
  ON security_categories FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to security_categories"
  ON security_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to security_categories"
  ON security_categories FOR DELETE TO anon, authenticated USING (true);

-- security_category_projects
ALTER TABLE security_category_projects ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON security_category_projects TO anon, authenticated;

CREATE POLICY "Allow anonymous read access to security_category_projects"
  ON security_category_projects FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access to security_category_projects"
  ON security_category_projects FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to security_category_projects"
  ON security_category_projects FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to security_category_projects"
  ON security_category_projects FOR DELETE TO anon, authenticated USING (true);

-- security_category_users
ALTER TABLE security_category_users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON security_category_users TO anon, authenticated;

CREATE POLICY "Allow anonymous read access to security_category_users"
  ON security_category_users FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert access to security_category_users"
  ON security_category_users FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to security_category_users"
  ON security_category_users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to security_category_users"
  ON security_category_users FOR DELETE TO anon, authenticated USING (true);