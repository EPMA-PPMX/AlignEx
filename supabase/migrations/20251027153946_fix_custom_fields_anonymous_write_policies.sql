/*
  # Fix Custom Fields RLS Policies for Anonymous Users

  1. Changes
    - Add anonymous user write policies for custom_fields table
    - Allow anon users to INSERT, UPDATE, DELETE on custom_fields
  
  2. Security
    - Enables full CRUD access for anonymous users on custom_fields
    - Required because the app does not use authentication
*/

-- Drop and recreate to ensure clean state
DROP POLICY IF EXISTS "Anonymous users can create custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Anonymous users can update custom fields" ON custom_fields;
DROP POLICY IF EXISTS "Anonymous users can delete custom fields" ON custom_fields;

-- Add anonymous user write policies
CREATE POLICY "Anonymous users can create custom fields"
  ON custom_fields FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update custom fields"
  ON custom_fields FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete custom fields"
  ON custom_fields FOR DELETE
  TO anon
  USING (true);
