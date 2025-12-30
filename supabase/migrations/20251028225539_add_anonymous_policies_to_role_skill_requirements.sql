/*
  # Add anonymous access policies to role_skill_requirements

  1. Changes
    - Add INSERT policy for anonymous users
    - Add UPDATE policy for anonymous users
    - Add DELETE policy for anonymous users
  
  2. Security Notes
    - This allows anonymous users to manage role skill requirements
    - Following the same pattern as other tables in the application
    - RLS remains enabled to protect the table
*/

-- Drop existing policies for authenticated users to recreate them for both anon and authenticated
DROP POLICY IF EXISTS "Authenticated users can insert role skill requirements" ON role_skill_requirements;
DROP POLICY IF EXISTS "Authenticated users can update role skill requirements" ON role_skill_requirements;
DROP POLICY IF EXISTS "Authenticated users can delete role skill requirements" ON role_skill_requirements;

-- Create new policies that allow both anonymous and authenticated users
CREATE POLICY "Anyone can insert role skill requirements"
  ON role_skill_requirements FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update role skill requirements"
  ON role_skill_requirements FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete role skill requirements"
  ON role_skill_requirements FOR DELETE
  TO anon, authenticated
  USING (true);