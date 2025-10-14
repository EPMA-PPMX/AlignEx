/*
  # Add anonymous write access to projects table

  1. Changes
    - Add policy to allow anonymous users to create projects
    - This enables the New Project page to create projects without authentication

  2. Security
    - Only INSERT access is granted to anonymous users for creating new projects
    - Users can only create projects, not update or delete them
*/

CREATE POLICY "Anonymous users can create projects"
  ON projects
  FOR INSERT
  TO anon
  WITH CHECK (true);