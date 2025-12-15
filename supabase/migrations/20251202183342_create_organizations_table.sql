/*
  # Create Organizations Table
  
  This table manages tenant organizations in the system.
  
  1. New Tables
    - `organizations`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text, required) - Organization name
      - `domain` (text, optional) - Organization domain
      - `billing_email` (text, optional) - Email for billing communications
      - `is_active` (boolean) - Whether organization is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `organizations` table
    - Add policy for anonymous users to read organizations (temporary for development)
    - Add policy for anonymous users to manage organizations (temporary for development)
  
  3. Notes
    - This is the foundation for multi-tenant architecture
    - All users will be linked to an organization
    - Module licenses will be at organization level
*/

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  billing_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to organizations"
  ON organizations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to organizations"
  ON organizations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to organizations"
  ON organizations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to organizations"
  ON organizations FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Insert default organization for existing installation
INSERT INTO organizations (id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', true)
ON CONFLICT (id) DO NOTHING;