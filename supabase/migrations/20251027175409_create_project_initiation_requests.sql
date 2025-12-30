/*
  # Create project initiation requests table

  1. New Tables
    - `project_initiation_requests`
      - `id` (uuid, primary key) - Unique identifier
      - `project_name` (text, required) - Name of the proposed project
      - `description` (text, optional) - Detailed description
      - `project_type` (text, required) - Type of project (e.g., Infrastructure, Software, Process Improvement)
      - `problem_statement` (text, required) - Problem being addressed
      - `estimated_start_date` (date, optional) - Expected start date
      - `estimated_duration` (text, optional) - Expected duration (e.g., "3 months", "6 weeks")
      - `initial_estimated_cost` (text, optional) - Initial cost estimate
      - `expected_benefits` (text, required) - Benefits expected from the project
      - `consequences_of_inaction` (text, required) - What happens if project is not done
      - `comments` (text, optional) - Additional notes or comments
      - `status` (text, default 'Draft') - Draft, Pending Approval, Approved, Rejected, More Information Needed
      - `submitted_by` (text, optional) - Name/email of requester
      - `submitted_at` (timestamptz) - When request was submitted
      - `reviewed_by` (text, optional) - Name of reviewer
      - `reviewed_at` (timestamptz, optional) - When request was reviewed
      - `review_comments` (text, optional) - Comments from reviewer
      - `created_at` (timestamptz) - When request was created
      - `updated_at` (timestamptz) - When request was last updated

    - `project_request_priorities`
      - `id` (uuid, primary key) - Unique identifier
      - `request_id` (uuid, foreign key) - References project_initiation_requests
      - `priority_id` (uuid, foreign key) - References organizational_priorities
      - `expected_contribution` (text, required) - How much this project will contribute
      - `created_at` (timestamptz) - When the link was created

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated and anonymous users

  3. Indexes
    - Add index on status for faster filtering
    - Add index on request_id for faster queries
    - Add index on priority_id for faster queries
*/

-- Create project_initiation_requests table
CREATE TABLE IF NOT EXISTS project_initiation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  description text,
  project_type text NOT NULL,
  problem_statement text NOT NULL,
  estimated_start_date date,
  estimated_duration text,
  initial_estimated_cost text,
  expected_benefits text NOT NULL,
  consequences_of_inaction text NOT NULL,
  comments text,
  status text NOT NULL DEFAULT 'Draft',
  submitted_by text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  review_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT project_initiation_requests_status_check 
    CHECK (status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'More Information Needed'))
);

-- Create project_request_priorities table
CREATE TABLE IF NOT EXISTS project_request_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES project_initiation_requests(id) ON DELETE CASCADE,
  priority_id uuid NOT NULL REFERENCES organizational_priorities(id) ON DELETE CASCADE,
  expected_contribution text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(request_id, priority_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_initiation_requests_status 
  ON project_initiation_requests(status);

CREATE INDEX IF NOT EXISTS idx_project_initiation_requests_submitted_at 
  ON project_initiation_requests(submitted_at);

CREATE INDEX IF NOT EXISTS idx_project_request_priorities_request_id 
  ON project_request_priorities(request_id);

CREATE INDEX IF NOT EXISTS idx_project_request_priorities_priority_id 
  ON project_request_priorities(priority_id);

-- Enable RLS
ALTER TABLE project_initiation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_request_priorities ENABLE ROW LEVEL SECURITY;

-- Policies for project_initiation_requests (authenticated users)
CREATE POLICY "Authenticated users can view project requests"
  ON project_initiation_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create project requests"
  ON project_initiation_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update project requests"
  ON project_initiation_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project requests"
  ON project_initiation_requests FOR DELETE
  TO authenticated
  USING (true);

-- Policies for project_initiation_requests (anonymous users)
CREATE POLICY "Anonymous users can view project requests"
  ON project_initiation_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project requests"
  ON project_initiation_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project requests"
  ON project_initiation_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project requests"
  ON project_initiation_requests FOR DELETE
  TO anon
  USING (true);

-- Policies for project_request_priorities (authenticated users)
CREATE POLICY "Authenticated users can view request priorities"
  ON project_request_priorities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create request priorities"
  ON project_request_priorities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update request priorities"
  ON project_request_priorities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete request priorities"
  ON project_request_priorities FOR DELETE
  TO authenticated
  USING (true);

-- Policies for project_request_priorities (anonymous users)
CREATE POLICY "Anonymous users can view request priorities"
  ON project_request_priorities FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create request priorities"
  ON project_request_priorities FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update request priorities"
  ON project_request_priorities FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete request priorities"
  ON project_request_priorities FOR DELETE
  TO anon
  USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_project_initiation_requests_updated_at
  BEFORE UPDATE ON project_initiation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();