/*
  # Add anonymous access to project-related tables

  1. Changes
    - Add policies to allow anonymous users to access project-related data
    - Tables: project_field_values, project_risks, project_issues, change_requests, project_documents, project_budgets

  2. Security
    - Full CRUD access granted to anonymous users for all tables
    - Note: In production, these should be restricted to authenticated users only
*/

-- project_field_values
CREATE POLICY "Anonymous users can read project field values"
  ON project_field_values
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project field values"
  ON project_field_values
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project field values"
  ON project_field_values
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project field values"
  ON project_field_values
  FOR DELETE
  TO anon
  USING (true);

-- project_risks
CREATE POLICY "Anonymous users can read project risks"
  ON project_risks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project risks"
  ON project_risks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project risks"
  ON project_risks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project risks"
  ON project_risks
  FOR DELETE
  TO anon
  USING (true);

-- project_issues
CREATE POLICY "Anonymous users can read project issues"
  ON project_issues
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project issues"
  ON project_issues
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project issues"
  ON project_issues
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project issues"
  ON project_issues
  FOR DELETE
  TO anon
  USING (true);

-- change_requests
CREATE POLICY "Anonymous users can read change requests"
  ON change_requests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create change requests"
  ON change_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update change requests"
  ON change_requests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete change requests"
  ON change_requests
  FOR DELETE
  TO anon
  USING (true);

-- project_documents
CREATE POLICY "Anonymous users can read project documents"
  ON project_documents
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project documents"
  ON project_documents
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project documents"
  ON project_documents
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project documents"
  ON project_documents
  FOR DELETE
  TO anon
  USING (true);

-- project_budgets
CREATE POLICY "Anonymous users can read project budgets"
  ON project_budgets
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project budgets"
  ON project_budgets
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project budgets"
  ON project_budgets
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project budgets"
  ON project_budgets
  FOR DELETE
  TO anon
  USING (true);