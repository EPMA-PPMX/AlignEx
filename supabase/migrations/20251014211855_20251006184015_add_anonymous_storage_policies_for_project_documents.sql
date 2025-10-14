/*
  # Add anonymous access to project documents storage

  1. Changes
    - Add policies to allow anonymous users to upload, read, update, and delete project documents
    - This enables file uploads without authentication

  2. Security
    - Full CRUD access granted to anonymous users for project-documents bucket
    - Note: In production, these should be restricted to authenticated users only
*/

-- Allow anonymous users to upload files
CREATE POLICY "Anonymous users can upload project documents"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'project-documents');

-- Allow anonymous users to read files
CREATE POLICY "Anonymous users can view project documents"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'project-documents');

-- Allow anonymous users to delete files
CREATE POLICY "Anonymous users can delete project documents"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'project-documents');

-- Allow anonymous users to update file metadata
CREATE POLICY "Anonymous users can update project documents"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'project-documents')
  WITH CHECK (bucket_id = 'project-documents');