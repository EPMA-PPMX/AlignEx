/*
  # Add anonymous read access to projects table

  1. Changes
    - Add policy to allow anonymous users to read projects
    - This enables the Projects page to display projects without authentication

  2. Security
    - Only SELECT access is granted to anonymous users
    - Write operations still require authentication
*/

CREATE POLICY "Anonymous users can read projects"
  ON projects
  FOR SELECT
  TO anon
  USING (true);