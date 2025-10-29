/*
  # Create project_issues table

  1. New Tables
    - `project_issues`
      - `id` (uuid, primary key) - Unique identifier for the issue
      - `project_id` (uuid, foreign key) - Reference to the project
      - `title` (text) - Issue title/name
      - `description` (text) - Detailed description of the issue
      - `category` (text) - Issue category (e.g., Technical, Process, Resource, Quality)
      - `priority` (text) - Priority level (Low, Medium, High, Critical)
      - `severity` (text) - Severity level (Low, Medium, High, Critical)
      - `status` (text) - Current status (Open, In Progress, Resolved, Closed)
      - `owner` (text) - Person responsible for resolving the issue
      - `assigned_to` (text) - Person assigned to work on the issue
      - `identified_date` (date) - When the issue was identified
      - `target_resolution_date` (date) - Target date to resolve
      - `resolution_date` (date) - Actual date issue was resolved
      - `resolution_notes` (text) - Notes about how the issue was resolved
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `project_issues` table
    - Add policies for anonymous users to read and write issues
*/

CREATE TABLE IF NOT EXISTS project_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'General',
  priority text DEFAULT 'Medium',
  severity text DEFAULT 'Medium',
  status text DEFAULT 'Open',
  owner text,
  assigned_to text,
  identified_date date DEFAULT CURRENT_DATE,
  target_resolution_date date,
  resolution_date date,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to project_issues"
  ON project_issues
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to project_issues"
  ON project_issues
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to project_issues"
  ON project_issues
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to project_issues"
  ON project_issues
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON project_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_status ON project_issues(status);
CREATE INDEX IF NOT EXISTS idx_project_issues_priority ON project_issues(priority);