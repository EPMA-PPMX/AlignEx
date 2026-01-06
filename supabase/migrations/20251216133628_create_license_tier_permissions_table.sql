/*
  # Create License Tier Permissions Table
  
  This table defines what actions each license tier can perform.
  Permissions apply consistently across all available modules.
  
  1. New Tables
    - `license_tier_permissions`
      - `id` (uuid, primary key) - Unique identifier
      - `license_tier` (text) - License level: 'read_only', 'team_member', 'full_license'
      - `permission_key` (text) - Permission identifier (e.g., 'project.create', 'timesheet.enter')
      - `permission_name` (text) - Human-readable permission name
      - `description` (text, optional) - Description of what this permission allows
      - `can_execute` (boolean) - Whether this tier can perform this action
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `license_tier_permissions` table
    - Add policies for anonymous access (temporary for development)
  
  3. Indexes
    - Index on license_tier for quick lookups
    - Index on permission_key for quick permission checks
    - Unique constraint on (license_tier, permission_key)
  
  4. Notes
    - Permissions are defined per action, not per module
    - Module availability is controlled separately by organization_modules
    - This table is populated with default permissions during migration
*/

CREATE TABLE IF NOT EXISTS license_tier_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_tier text NOT NULL CHECK (license_tier IN ('read_only', 'team_member', 'full_license')),
  permission_key text NOT NULL,
  permission_name text NOT NULL,
  description text,
  can_execute boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure only one permission definition per tier per key
  CONSTRAINT unique_tier_permission UNIQUE (license_tier, permission_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_license_tier_permissions_tier ON license_tier_permissions(license_tier);
CREATE INDEX IF NOT EXISTS idx_license_tier_permissions_key ON license_tier_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_license_tier_permissions_execute ON license_tier_permissions(can_execute);

-- Enable RLS
ALTER TABLE license_tier_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to license_tier_permissions"
  ON license_tier_permissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to license_tier_permissions"
  ON license_tier_permissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to license_tier_permissions"
  ON license_tier_permissions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to license_tier_permissions"
  ON license_tier_permissions FOR DELETE
  TO anon
  USING (true);

-- Insert default permissions for all license tiers
-- READ ONLY PERMISSIONS (view only)
INSERT INTO license_tier_permissions (license_tier, permission_key, permission_name, description, can_execute) VALUES
('read_only', 'view', 'View Data', 'Can view all data user has access to', true),
('read_only', 'create', 'Create Records', 'Can create new records', false),
('read_only', 'edit', 'Edit Records', 'Can edit existing records', false),
('read_only', 'delete', 'Delete Records', 'Can delete records', false),
('read_only', 'manage', 'Manage Settings', 'Can access and modify settings', false),
('read_only', 'timesheet.enter', 'Enter Timesheet', 'Can enter timesheet entries', false),
('read_only', 'timesheet.approve', 'Approve Timesheet', 'Can approve team timesheets', false),
('read_only', 'project.create', 'Create Projects', 'Can create new projects', false),
('read_only', 'project.manage', 'Manage Projects', 'Can manage project settings and teams', false),
('read_only', 'request.create', 'Create Requests', 'Can create project requests', false),
('read_only', 'resource.manage', 'Manage Resources', 'Can create and manage resources', false),
('read_only', 'skills.manage_own', 'Manage Own Skills', 'Can manage own skill profile', false),
('read_only', 'skills.manage_all', 'Manage All Skills', 'Can manage all user skills and categories', false),
('read_only', 'benefits.track', 'Track Benefits', 'Can update benefit tracking values', false),
('read_only', 'export', 'Export Data', 'Can export data and reports', true)
ON CONFLICT (license_tier, permission_key) DO NOTHING;

-- TEAM MEMBER PERMISSIONS (view + timesheet + own data)
INSERT INTO license_tier_permissions (license_tier, permission_key, permission_name, description, can_execute) VALUES
('team_member', 'view', 'View Data', 'Can view all data user has access to', true),
('team_member', 'create', 'Create Records', 'Can create new records', false),
('team_member', 'edit', 'Edit Records', 'Can edit existing records', false),
('team_member', 'delete', 'Delete Records', 'Can delete records', false),
('team_member', 'manage', 'Manage Settings', 'Can access and modify settings', false),
('team_member', 'timesheet.enter', 'Enter Timesheet', 'Can enter timesheet entries', true),
('team_member', 'timesheet.approve', 'Approve Timesheet', 'Can approve team timesheets', false),
('team_member', 'project.create', 'Create Projects', 'Can create new projects', false),
('team_member', 'project.manage', 'Manage Projects', 'Can manage project settings and teams', false),
('team_member', 'request.create', 'Create Requests', 'Can create project requests', true),
('team_member', 'resource.manage', 'Manage Resources', 'Can create and manage resources', false),
('team_member', 'skills.manage_own', 'Manage Own Skills', 'Can manage own skill profile', true),
('team_member', 'skills.manage_all', 'Manage All Skills', 'Can manage all user skills and categories', false),
('team_member', 'benefits.track', 'Track Benefits', 'Can update benefit tracking values', false),
('team_member', 'export', 'Export Data', 'Can export data and reports', true)
ON CONFLICT (license_tier, permission_key) DO NOTHING;

-- FULL LICENSE PERMISSIONS (complete access)
INSERT INTO license_tier_permissions (license_tier, permission_key, permission_name, description, can_execute) VALUES
('full_license', 'view', 'View Data', 'Can view all data user has access to', true),
('full_license', 'create', 'Create Records', 'Can create new records', true),
('full_license', 'edit', 'Edit Records', 'Can edit existing records', true),
('full_license', 'delete', 'Delete Records', 'Can delete records', true),
('full_license', 'manage', 'Manage Settings', 'Can access and modify settings', true),
('full_license', 'timesheet.enter', 'Enter Timesheet', 'Can enter timesheet entries', true),
('full_license', 'timesheet.approve', 'Approve Timesheet', 'Can approve team timesheets', true),
('full_license', 'project.create', 'Create Projects', 'Can create new projects', true),
('full_license', 'project.manage', 'Manage Projects', 'Can manage project settings and teams', true),
('full_license', 'request.create', 'Create Requests', 'Can create project requests', true),
('full_license', 'resource.manage', 'Manage Resources', 'Can create and manage resources', true),
('full_license', 'skills.manage_own', 'Manage Own Skills', 'Can manage own skill profile', true),
('full_license', 'skills.manage_all', 'Manage All Skills', 'Can manage all user skills and categories', true),
('full_license', 'benefits.track', 'Track Benefits', 'Can update benefit tracking values', true),
('full_license', 'export', 'Export Data', 'Can export data and reports', true)
ON CONFLICT (license_tier, permission_key) DO NOTHING;
