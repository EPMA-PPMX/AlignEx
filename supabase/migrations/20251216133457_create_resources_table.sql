/*
  # Create Resources Management Table

  1. New Tables
    - `resources`
      - `id` (uuid, primary key) - Unique identifier
      - `resource_type` (text) - Either 'person' or 'generic'
      - `first_name` (text) - First name (for people)
      - `last_name` (text) - Last name (for people)
      - `email` (text, unique) - Email address (for people)
      - `resource_name` (text) - Name for generic resources (equipment, rooms, etc.)
      - `display_name` (text, generated) - Computed full name or resource name for display
      - `roles` (text[]) - Array of role names
      - `cost_rate` (numeric) - Hourly or daily rate
      - `rate_type` (text) - 'hourly' or 'daily'
      - `status` (text) - 'active' or 'inactive'
      - `ad_synced` (boolean) - Whether this resource was synced from AD
      - `ad_user_id` (text) - AD user identifier for sync matching
      - `department` (text) - Department/team
      - `location` (text) - Physical location
      - `notes` (text) - Additional notes
      - `custom_attributes` (jsonb) - Flexible storage for additional AD attributes
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `last_synced_at` (timestamptz) - Last AD sync timestamp

  2. Security
    - Enable RLS on `resources` table
    - Add policy for anonymous users to read resources
    - Add policy for anonymous users to manage resources

  3. Indexes
    - Index on email for quick lookups
    - Index on status for filtering active resources
    - Index on resource_type for filtering
*/

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('person', 'generic')),
  
  -- Person-specific fields
  first_name text,
  last_name text,
  email text UNIQUE,
  
  -- Generic resource fields
  resource_name text,
  
  -- Common fields
  display_name text GENERATED ALWAYS AS (
    CASE 
      WHEN resource_type = 'person' THEN COALESCE(first_name || ' ' || last_name, email)
      ELSE resource_name
    END
  ) STORED,
  
  roles text[] DEFAULT '{}',
  cost_rate numeric(10, 2),
  rate_type text CHECK (rate_type IN ('hourly', 'daily', 'monthly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- AD Sync fields
  ad_synced boolean DEFAULT false,
  ad_user_id text,
  last_synced_at timestamptz,
  
  -- Additional fields
  department text,
  location text,
  notes text,
  custom_attributes jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT person_requires_name CHECK (
    resource_type != 'person' OR (first_name IS NOT NULL AND last_name IS NOT NULL)
  ),
  CONSTRAINT generic_requires_name CHECK (
    resource_type != 'generic' OR resource_name IS NOT NULL
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_email ON resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_ad_user_id ON resources(ad_user_id);

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to resources"
  ON resources FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to resources"
  ON resources FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to resources"
  ON resources FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to resources"
  ON resources FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();
