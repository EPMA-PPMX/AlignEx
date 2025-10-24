/*
  # Create organizational priorities and project impact tracking

  1. New Tables
    - `organizational_priorities`
      - `id` (uuid, primary key) - Unique identifier
      - `title` (text, required) - Priority title (e.g., "Reduce Operational Cost")
      - `description` (text, optional) - Detailed description of the priority
      - `target_value` (text, required) - Target to achieve (e.g., "20% reduction", "$500K savings")
      - `owner` (text, required) - Name of the priority owner
      - `status` (text, default 'Active') - Active, On Hold, Completed, Cancelled
      - `created_at` (timestamptz) - When the priority was created
      - `updated_at` (timestamptz) - When the priority was last updated

    - `project_priority_impacts`
      - `id` (uuid, primary key) - Unique identifier
      - `project_id` (uuid, foreign key) - References projects table
      - `priority_id` (uuid, foreign key) - References organizational_priorities table
      - `planned_impact` (text, required) - Expected impact on the priority target
      - `actual_impact` (text, optional) - Actual achieved impact
      - `notes` (text, optional) - Additional notes about the impact
      - `created_at` (timestamptz) - When the link was created
      - `updated_at` (timestamptz) - When the link was last updated

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated and anonymous users to manage priorities
    - Add policies for managing project-priority relationships

  3. Indexes
    - Add index on priority_id for faster queries
    - Add index on project_id for faster queries
    - Add unique constraint on (project_id, priority_id) to prevent duplicates
*/

-- Create organizational_priorities table
CREATE TABLE IF NOT EXISTS organizational_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_value text NOT NULL,
  owner text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT organizational_priorities_status_check 
    CHECK (status IN ('Active', 'On Hold', 'Completed', 'Cancelled'))
);

-- Create project_priority_impacts table
CREATE TABLE IF NOT EXISTS project_priority_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  priority_id uuid NOT NULL REFERENCES organizational_priorities(id) ON DELETE CASCADE,
  planned_impact text NOT NULL,
  actual_impact text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(project_id, priority_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizational_priorities_status 
  ON organizational_priorities(status);

CREATE INDEX IF NOT EXISTS idx_project_priority_impacts_project_id 
  ON project_priority_impacts(project_id);

CREATE INDEX IF NOT EXISTS idx_project_priority_impacts_priority_id 
  ON project_priority_impacts(priority_id);

-- Enable RLS
ALTER TABLE organizational_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_priority_impacts ENABLE ROW LEVEL SECURITY;

-- Policies for organizational_priorities (authenticated users)
CREATE POLICY "Authenticated users can view organizational priorities"
  ON organizational_priorities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create organizational priorities"
  ON organizational_priorities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update organizational priorities"
  ON organizational_priorities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete organizational priorities"
  ON organizational_priorities FOR DELETE
  TO authenticated
  USING (true);

-- Policies for organizational_priorities (anonymous users)
CREATE POLICY "Anonymous users can view organizational priorities"
  ON organizational_priorities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create organizational priorities"
  ON organizational_priorities FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update organizational priorities"
  ON organizational_priorities FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete organizational priorities"
  ON organizational_priorities FOR DELETE
  TO anon
  USING (true);

-- Policies for project_priority_impacts (authenticated users)
CREATE POLICY "Authenticated users can view project priority impacts"
  ON project_priority_impacts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project priority impacts"
  ON project_priority_impacts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project priority impacts"
  ON project_priority_impacts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project priority impacts"
  ON project_priority_impacts FOR DELETE
  TO authenticated
  USING (true);

-- Policies for project_priority_impacts (anonymous users)
CREATE POLICY "Anonymous users can view project priority impacts"
  ON project_priority_impacts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project priority impacts"
  ON project_priority_impacts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project priority impacts"
  ON project_priority_impacts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project priority impacts"
  ON project_priority_impacts FOR DELETE
  TO anon
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_organizational_priorities_updated_at
  BEFORE UPDATE ON organizational_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_priority_impacts_updated_at
  BEFORE UPDATE ON project_priority_impacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();