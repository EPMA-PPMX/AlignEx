/*
  # Create Organization Modules Table
  
  This table manages tenant-level feature module licenses (Skills, Benefits).
  Base module is always included with any user license.
  
  1. New Tables
    - `organization_modules`
      - `id` (uuid, primary key) - Unique identifier
      - `organization_id` (uuid, foreign key) - References organizations table
      - `module_key` (text) - Module identifier: 'base', 'skills', 'benefits'
      - `module_name` (text) - Display name of the module
      - `is_active` (boolean) - Whether module is currently active
      - `license_key` (text, optional) - License key for activation
      - `activation_date` (date, optional) - When module was activated
      - `expiry_date` (date, optional) - When module license expires
      - `purchased_date` (date, optional) - When module was purchased
      - `renewal_date` (date, optional) - When module should be renewed
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `organization_modules` table
    - Add policies for anonymous access (temporary for development)
  
  3. Indexes
    - Index on organization_id for quick lookups
    - Unique constraint on (organization_id, module_key) to prevent duplicates
  
  4. Notes
    - Base module is always active and included
    - Skills and Benefits are optional add-ons
    - Entire organization gets module access if active
*/

CREATE TABLE IF NOT EXISTS organization_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_key text NOT NULL CHECK (module_key IN ('base', 'skills', 'benefits')),
  module_name text NOT NULL,
  is_active boolean DEFAULT false,
  license_key text,
  activation_date date,
  expiry_date date,
  purchased_date date,
  renewal_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure only one record per organization per module
  CONSTRAINT unique_org_module UNIQUE (organization_id, module_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organization_modules_org_id ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_module_key ON organization_modules(module_key);
CREATE INDEX IF NOT EXISTS idx_organization_modules_active ON organization_modules(is_active);

-- Enable RLS
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to organization_modules"
  ON organization_modules FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to organization_modules"
  ON organization_modules FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to organization_modules"
  ON organization_modules FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to organization_modules"
  ON organization_modules FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_modules_updated_at
  BEFORE UPDATE ON organization_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_modules_updated_at();

-- Insert default modules for default organization (all active for existing installation)
INSERT INTO organization_modules (organization_id, module_key, module_name, is_active, activation_date)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'base', 'Base Platform', true, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000001', 'skills', 'Skills Management', true, CURRENT_DATE),
  ('00000000-0000-0000-0000-000000000001', 'benefits', 'Benefit Realization', true, CURRENT_DATE)
ON CONFLICT (organization_id, module_key) DO NOTHING;
