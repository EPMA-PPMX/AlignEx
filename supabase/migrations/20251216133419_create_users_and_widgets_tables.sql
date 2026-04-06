/*
  # Create Users and Dashboard Widgets Tables
  
  This migration creates the core user management tables that are required for the application to function.
  
  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique identifier
      - `email` (text, unique, required) - User email address
      - `full_name` (text, required) - User's full name
      - `system_role` (text, required) - User's role in the system
      - `resource_id` (uuid, optional) - Link to resources table
      - `avatar_url` (text, optional) - URL to user's avatar image
      - `is_active` (boolean) - Whether user account is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `user_dashboard_widgets`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References users table
      - `widget_type` (text, required) - Type of widget
      - `is_enabled` (boolean) - Whether widget is visible
      - `position_order` (integer) - Order of widget on dashboard
      - `size` (text) - Widget size: small, medium, or large
      - `settings` (jsonb) - Widget-specific settings
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on both tables
    - Add policies for anonymous access (temporary for development)
  
  3. Initial Data
    - Creates demo user for testing
    - Sets up default dashboard widgets for demo user
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  system_role text NOT NULL CHECK (system_role IN ('Project Manager', 'Team Member', 'Portfolio Manager')),
  resource_id uuid,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_resource_id ON users(resource_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access
CREATE POLICY "Allow anonymous read access to users"
  ON users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to users"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to users"
  ON users FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to users"
  ON users FOR DELETE
  TO anon
  USING (true);

-- Create user_dashboard_widgets table
CREATE TABLE IF NOT EXISTS user_dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  is_enabled boolean DEFAULT true,
  position_order integer NOT NULL DEFAULT 0,
  size text NOT NULL DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_user_id ON user_dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_widgets_position ON user_dashboard_widgets(position_order);

-- Enable RLS
ALTER TABLE user_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access
CREATE POLICY "Allow anonymous read access to user_dashboard_widgets"
  ON user_dashboard_widgets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to user_dashboard_widgets"
  ON user_dashboard_widgets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to user_dashboard_widgets"
  ON user_dashboard_widgets FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to user_dashboard_widgets"
  ON user_dashboard_widgets FOR DELETE
  TO anon
  USING (true);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

CREATE OR REPLACE FUNCTION update_user_dashboard_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_dashboard_widgets_updated_at
  BEFORE UPDATE ON user_dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_dashboard_widgets_updated_at();

-- Insert demo user
INSERT INTO users (id, email, full_name, system_role, is_active)
VALUES (
  '65340f6a-cf92-4490-b36a-57b5452688f8',
  'demo@alignex.com',
  'Demo User',
  'Project Manager',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  system_role = EXCLUDED.system_role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Insert default dashboard widgets for demo user
INSERT INTO user_dashboard_widgets (user_id, widget_type, is_enabled, position_order, size, settings) VALUES
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'my_projects', true, 1, 'large', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'my_tasks', true, 2, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'deadlines', true, 3, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'recent_activity', true, 4, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'project_health', true, 5, 'large', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'my_risks', false, 6, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'my_issues', false, 7, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'personal_goals', false, 8, 'small', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'timesheet_quick', false, 9, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'pending_approvals', false, 10, 'medium', '{}'),
  ('65340f6a-cf92-4490-b36a-57b5452688f8', 'team_capacity', false, 11, 'large', '{}')
ON CONFLICT DO NOTHING;
