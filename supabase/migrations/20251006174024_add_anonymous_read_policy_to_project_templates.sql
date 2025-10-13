/*
  # Add anonymous read access to project_templates table

  1. Changes
    - Add policy to allow anonymous users to read project templates
    - This enables the New Project page to fetch available templates

  2. Security
    - Only SELECT access is granted to anonymous users
    - Write operations still require authentication
*/

CREATE POLICY "Anonymous users can read project templates"
  ON project_templates
  FOR SELECT
  TO anon
  USING (true);