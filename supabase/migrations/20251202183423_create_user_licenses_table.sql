/*
  # Create User Licenses Table
  
  This table manages per-user base license tiers.
  Each user has exactly one license tier that determines their permissions.
  
  1. New Tables
    - `user_licenses`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, optional) - User identifier (email-based if not registered yet)
      - `user_email` (text, required) - User email for identification
      - `organization_id` (uuid, foreign key) - References organizations table
      - `license_tier` (text) - License level: 'read_only', 'team_member', 'full_license'
      - `is_active` (boolean) - Whether license is currently active
      - `assigned_date` (date) - When license was assigned
      - `last_access_date` (date, optional) - Last time user accessed system
      - `notes` (text, optional) - Administrative notes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `user_licenses` table
    - Add policies for anonymous access (temporary for development)
  
  3. Indexes
    - Index on user_email for quick lookups
    - Index on organization_id for tenant filtering
    - Index on license_tier for reporting
    - Unique constraint on user_email to ensure one license per user
  
  4. Notes
    - License tier applies to all available modules
    - Read Only: View only access
    - Team Member: View + timesheet entry
    - Full License: Complete access and management
*/

CREATE TABLE IF NOT EXISTS user_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  license_tier text NOT NULL CHECK (license_tier IN ('read_only', 'team_member', 'full_license')),
  is_active boolean DEFAULT true,
  assigned_date date DEFAULT CURRENT_DATE,
  last_access_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure only one license per user email
  CONSTRAINT unique_user_license UNIQUE (user_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_licenses_user_id ON user_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_licenses_user_email ON user_licenses(user_email);
CREATE INDEX IF NOT EXISTS idx_user_licenses_org_id ON user_licenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_licenses_tier ON user_licenses(license_tier);
CREATE INDEX IF NOT EXISTS idx_user_licenses_active ON user_licenses(is_active);

-- Enable RLS
ALTER TABLE user_licenses ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to user_licenses"
  ON user_licenses FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to user_licenses"
  ON user_licenses FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to user_licenses"
  ON user_licenses FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to user_licenses"
  ON user_licenses FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_licenses_updated_at
  BEFORE UPDATE ON user_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_licenses_updated_at();