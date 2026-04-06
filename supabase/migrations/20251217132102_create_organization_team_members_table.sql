/*
  # Create Organization Team Members Table

  1. New Tables
    - `organization_team_members`
      - `id` (uuid, primary key) - Unique identifier
      - `resource_id` (uuid, foreign key) - Reference to resources table
      - `added_at` (timestamptz) - When the member was added to the team
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `organization_team_members` table
    - Add policies for anonymous access

  3. Constraints
    - Unique constraint on resource_id to prevent duplicate team members
    - Foreign key constraint with CASCADE delete

  4. Indexes
    - Index on resource_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS organization_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL UNIQUE REFERENCES resources(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_team_members_resource_id ON organization_team_members(resource_id);

-- Enable RLS
ALTER TABLE organization_team_members ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access
CREATE POLICY "Allow anonymous read access to organization team members"
  ON organization_team_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to organization team members"
  ON organization_team_members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to organization team members"
  ON organization_team_members FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to organization team members"
  ON organization_team_members FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organization_team_members_updated_at
  BEFORE UPDATE ON organization_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_team_members_updated_at();