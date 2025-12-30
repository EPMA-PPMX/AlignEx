/*
  # Add Anonymous Policies to Schedule Templates
  
  1. Changes
    - Add anonymous access policies to schedule_templates table
    - This allows the application to work without authentication
  
  2. Security
    - Policies allow full CRUD access for anonymous users
    - This is consistent with other tables in the application
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all schedule templates" ON schedule_templates;
DROP POLICY IF EXISTS "Users can create schedule templates" ON schedule_templates;
DROP POLICY IF EXISTS "Users can update schedule templates" ON schedule_templates;
DROP POLICY IF EXISTS "Users can delete schedule templates" ON schedule_templates;

-- Create new policies with anonymous access
CREATE POLICY "Anyone can view schedule templates"
  ON schedule_templates
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create schedule templates"
  ON schedule_templates
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update schedule templates"
  ON schedule_templates
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete schedule templates"
  ON schedule_templates
  FOR DELETE
  USING (true);