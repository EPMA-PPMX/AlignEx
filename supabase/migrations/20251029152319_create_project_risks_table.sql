/*
  # Create project_risks table

  1. New Tables
    - `project_risks`
      - `id` (uuid, primary key) - Unique identifier for the risk
      - `project_id` (uuid, foreign key) - Reference to the project
      - `title` (text) - Risk title/name
      - `description` (text) - Detailed description of the risk
      - `category` (text) - Risk category (e.g., Technical, Financial, Schedule, Resource)
      - `probability` (text) - Likelihood of occurrence (Low, Medium, High)
      - `impact` (text) - Impact severity (Low, Medium, High)
      - `risk_score` (integer) - Calculated risk score
      - `mitigation_strategy` (text) - Plan to mitigate the risk
      - `owner` (text) - Person responsible for managing the risk
      - `status` (text) - Current status (Open, Monitoring, Closed, Occurred)
      - `identified_date` (date) - When the risk was identified
      - `target_resolution_date` (date) - Target date to resolve/mitigate
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `project_risks` table
    - Add policies for anonymous users to read and write risks
*/

CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'General',
  probability text DEFAULT 'Medium',
  impact text DEFAULT 'Medium',
  risk_score integer DEFAULT 5,
  mitigation_strategy text,
  owner text,
  status text DEFAULT 'Open',
  identified_date date DEFAULT CURRENT_DATE,
  target_resolution_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to project_risks"
  ON project_risks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to project_risks"
  ON project_risks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to project_risks"
  ON project_risks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to project_risks"
  ON project_risks
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_status ON project_risks(status);