/*
  # Add anonymous write access to project_templates table

  1. Changes
    - Add policies to allow anonymous users to create, update, and delete project templates
    - This enables the Settings page Project Templates tab to work without authentication

  2. Security
    - INSERT, UPDATE, and DELETE access granted to anonymous users
    - Note: In production, these should be restricted to authenticated users only
*/

CREATE POLICY "Anonymous users can create project templates"
  ON project_templates
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project templates"
  ON project_templates
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project templates"
  ON project_templates
  FOR DELETE
  TO anon
  USING (true);