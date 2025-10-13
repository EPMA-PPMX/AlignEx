/*
  # Add anonymous access to overview_configurations table

  1. Changes
    - Add policies to allow anonymous users to read, create, update, and delete overview configurations
    - This enables the Overview Page Designer to work without authentication

  2. Security
    - Full CRUD access granted to anonymous users
    - Note: In production, these should be restricted to authenticated users only
*/

CREATE POLICY "Anonymous users can read overview configurations"
  ON overview_configurations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create overview configurations"
  ON overview_configurations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update overview configurations"
  ON overview_configurations
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete overview configurations"
  ON overview_configurations
  FOR DELETE
  TO anon
  USING (true);