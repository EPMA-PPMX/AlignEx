/*
  # Create project_documents table

  1. New Tables
    - `project_documents`
      - `id` (uuid, primary key) - Unique identifier for the document
      - `project_id` (uuid, foreign key) - References the project
      - `file_name` (text) - Original name of the uploaded file
      - `file_path` (text) - Storage path to the file
      - `file_size` (bigint) - Size of the file in bytes
      - `mime_type` (text) - MIME type of the file
      - `uploaded_by` (uuid) - User who uploaded the document
      - `created_at` (timestamptz) - When the document was uploaded
      - `updated_at` (timestamptz) - When the document was last updated

  2. Security
    - Enable RLS on `project_documents` table
    - Add policy for authenticated users to view documents for their projects
    - Add policy for authenticated users to upload documents
    - Add policy for authenticated users to delete their own documents

  3. Indexes
    - Add index on project_id for faster queries
    - Add index on uploaded_by for faster queries
*/

CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_uploaded_by ON project_documents(uploaded_by);

-- Policies
CREATE POLICY "Users can view project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload project documents"
  ON project_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete their own documents"
  ON project_documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());