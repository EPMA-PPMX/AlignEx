/*
  # Fix Project Templates RLS Policies for Anonymous Users

  1. Changes
    - Add anonymous user policies for project_templates table
    - Allow anon users to SELECT, INSERT, UPDATE, DELETE on project_templates
  
  2. Security
    - Enables full CRUD access for anonymous users on project_templates
    - Required because the app does not use authentication
*/

-- Drop existing authenticated-only policy
DROP POLICY IF EXISTS "Users can manage project templates" ON project_templates;

-- Add anonymous user policies
CREATE POLICY "Anonymous users can read project templates"
  ON project_templates FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create project templates"
  ON project_templates FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project templates"
  ON project_templates FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project templates"
  ON project_templates FOR DELETE
  TO anon
  USING (true);

-- Keep authenticated user policy for future use
CREATE POLICY "Authenticated users can manage project templates"
  ON project_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
