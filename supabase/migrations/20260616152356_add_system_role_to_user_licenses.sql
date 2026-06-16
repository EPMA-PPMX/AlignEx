ALTER TABLE user_licenses
  ADD COLUMN IF NOT EXISTS system_role_id uuid REFERENCES roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_licenses_system_role ON user_licenses(system_role_id);
