/*
  # Create Project Team Members Table
  
  This table manages the assignment of resources to project teams with their roles,
  allocation percentages, and time periods.
  
  1. New Tables
    - `project_team_members`
      - `id` (uuid, primary key) - Unique identifier
      - `project_id` (uuid, foreign key) - References projects table
      - `resource_id` (uuid, foreign key) - References resources table
      - `role` (text) - Role/title for this resource on this project
      - `allocation_percentage` (numeric) - Percentage of time allocated (0-100)
      - `start_date` (date) - When the resource starts on the project
      - `end_date` (date, optional) - When the resource ends on the project
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `project_team_members` table
    - Add policy for anonymous users to read team members
    - Add policy for anonymous users to manage team members
    - Note: In production, these should be restricted to authenticated users only
  
  3. Indexes
    - Index on project_id for quick project team lookups
    - Index on resource_id for quick resource assignment lookups
    - Unique constraint on (project_id, resource_id) to prevent duplicate assignments
*/

CREATE TABLE IF NOT EXISTS project_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Team Member',
  allocation_percentage numeric(5,2) NOT NULL DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure a resource can only be added once per project
  CONSTRAINT unique_project_resource UNIQUE (project_id, resource_id),
  
  -- Ensure end_date is after start_date if provided
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_team_members_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_resource_id ON project_team_members(resource_id);
CREATE INDEX IF NOT EXISTS idx_project_team_members_dates ON project_team_members(start_date, end_date);

-- Enable RLS
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to project_team_members"
  ON project_team_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to project_team_members"
  ON project_team_members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to project_team_members"
  ON project_team_members FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to project_team_members"
  ON project_team_members FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_team_members_updated_at
  BEFORE UPDATE ON project_team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_project_team_members_updated_at();