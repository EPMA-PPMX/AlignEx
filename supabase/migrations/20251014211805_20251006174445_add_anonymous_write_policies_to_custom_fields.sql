/*
  # Add anonymous write access to custom_fields table

  1. Changes
    - Add policies to allow anonymous users to create, update, and delete custom fields
    - This enables the Settings page Custom Fields tab to work without authentication

  2. Security
    - INSERT, UPDATE, and DELETE access granted to anonymous users
    - Note: In production, these should be restricted to authenticated users only
*/

CREATE POLICY "Anonymous users can create custom fields"
  ON custom_fields
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update custom fields"
  ON custom_fields
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete custom fields"
  ON custom_fields
  FOR DELETE
  TO anon
  USING (true);