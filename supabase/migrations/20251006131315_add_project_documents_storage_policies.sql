/*
  # Add storage policies for project-documents bucket

  1. Storage Policies
    - Allow authenticated users to upload documents to project-documents bucket
    - Allow authenticated users to view/download documents from project-documents bucket
    - Allow authenticated users to delete documents from project-documents bucket
    - Allow authenticated users to update documents in project-documents bucket

  2. Security
    - All policies require authentication
    - Uses service role key on backend for secure access
*/

CREATE POLICY "Users can upload project documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Users can view project documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Users can delete project documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-documents');

CREATE POLICY "Users can update project documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'project-documents')
  WITH CHECK (bucket_id = 'project-documents');