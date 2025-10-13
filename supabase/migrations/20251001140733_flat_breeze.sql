/*
  # Create project risks and issues tables

  1. New Tables
    - `project_risks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `title` (text, required)
      - `description` (text, required)
      - `impact` (text, optional)
      - `type` (text, required - Critical, High, Medium)
      - `status` (text, required - Open, In Progress, Resolved, Closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `project_issues`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `title` (text, required)
      - `description` (text, required)
      - `impact` (text, optional)
      - `type` (text, required - Critical, High, Medium)
      - `status` (text, required - Open, In Progress, Resolved, Closed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage risks and issues

  3. Indexes
    - Index on project_id for fast lookups
*/

-- Create project_risks table
CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  impact text,
  type text NOT NULL CHECK (type IN ('Critical', 'High', 'Medium')),
  status text NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_issues table
CREATE TABLE IF NOT EXISTS project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  impact text,
  type text NOT NULL CHECK (type IN ('Critical', 'High', 'Medium')),
  status text NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON project_risks(status);
CREATE INDEX IF NOT EXISTS idx_project_risks_type ON project_risks(type);

CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON project_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_status ON project_issues(status);
CREATE INDEX IF NOT EXISTS idx_project_issues_type ON project_issues(type);

-- Enable RLS
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage project risks"
  ON project_risks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can manage project issues"
  ON project_issues
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON project_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_issues_updated_at
  BEFORE UPDATE ON project_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();