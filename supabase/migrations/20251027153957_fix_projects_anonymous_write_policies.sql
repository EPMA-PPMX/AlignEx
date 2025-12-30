/*
  # Fix Projects RLS Policies for Anonymous Users

  1. Changes
    - Add anonymous user update and delete policies for projects table
    - Allow anon users to UPDATE and DELETE on projects
  
  2. Security
    - Enables full CRUD access for anonymous users on projects
    - Required because the app does not use authentication
*/

-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Anonymous users can update projects" ON projects;
DROP POLICY IF EXISTS "Anonymous users can delete projects" ON projects;

-- Add anonymous user write policies
CREATE POLICY "Anonymous users can update projects"
  ON projects FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete projects"
  ON projects FOR DELETE
  TO anon
  USING (true);
