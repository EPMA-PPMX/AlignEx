/*
  # Fix Overview Configurations RLS Policies for Anonymous Users

  1. Changes
    - Add anonymous user policies for overview_configurations table
    - Allow anon users to SELECT, INSERT, UPDATE, DELETE on overview_configurations
  
  2. Security
    - Enables full CRUD access for anonymous users on overview_configurations
    - Required because the app does not use authentication
*/

-- Drop existing authenticated-only policy if it exists
DROP POLICY IF EXISTS "Users can manage overview configurations" ON overview_configurations;

-- Add anonymous user policies
CREATE POLICY "Anonymous users can read overview configurations"
  ON overview_configurations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create overview configurations"
  ON overview_configurations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update overview configurations"
  ON overview_configurations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete overview configurations"
  ON overview_configurations FOR DELETE
  TO anon
  USING (true);

-- Keep authenticated user policy for future use
CREATE POLICY "Authenticated users can manage overview configurations"
  ON overview_configurations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
