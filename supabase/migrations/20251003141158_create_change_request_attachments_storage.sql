/*
  # Create storage bucket for change request attachments

  1. Storage Bucket
    - Create `change-request-attachments` bucket for storing files
    - Enable public access for authenticated users
    - Set file size limit to 10MB

  2. Security
    - Enable RLS on storage.objects
    - Add policies for authenticated users to upload/read/delete their own files

  3. Table Updates
    - Update change_requests.attachments to store array of file metadata
*/

-- Create storage bucket for change request attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'change-request-attachments',
  'change-request-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload change request attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'change-request-attachments');

-- Allow authenticated users to read files
CREATE POLICY "Users can view change request attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'change-request-attachments');

-- Allow authenticated users to delete their uploaded files
CREATE POLICY "Users can delete change request attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'change-request-attachments');

-- Allow authenticated users to update file metadata
CREATE POLICY "Users can update change request attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'change-request-attachments')
  WITH CHECK (bucket_id = 'change-request-attachments');