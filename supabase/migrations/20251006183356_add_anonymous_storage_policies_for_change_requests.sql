/*
  # Add anonymous access to change request attachments storage

  1. Changes
    - Add policies to allow anonymous users to upload, read, update, and delete change request attachments
    - This enables file uploads without authentication

  2. Security
    - Full CRUD access granted to anonymous users for change-request-attachments bucket
    - Note: In production, these should be restricted to authenticated users only
*/

-- Allow anonymous users to upload files
CREATE POLICY "Anonymous users can upload change request attachments"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'change-request-attachments');

-- Allow anonymous users to read files
CREATE POLICY "Anonymous users can view change request attachments"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'change-request-attachments');

-- Allow anonymous users to delete files
CREATE POLICY "Anonymous users can delete change request attachments"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'change-request-attachments');

-- Allow anonymous users to update file metadata
CREATE POLICY "Anonymous users can update change request attachments"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'change-request-attachments')
  WITH CHECK (bucket_id = 'change-request-attachments');