/*
  # Add anonymous read access to custom_fields table

  1. Changes
    - Add policy to allow anonymous users to read custom_fields
    - This enables the Budget Category form to fetch Cost Category options without authentication

  2. Security
    - Only SELECT access is granted to anonymous users
    - Write operations still require authentication
*/

CREATE POLICY "Anonymous users can read custom fields"
  ON custom_fields
  FOR SELECT
  TO anon
  USING (true);