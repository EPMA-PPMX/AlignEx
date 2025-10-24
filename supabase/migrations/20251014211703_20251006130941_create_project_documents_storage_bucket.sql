/*
  # Create project-documents storage bucket

  1. Storage
    - Create `project-documents` bucket for storing project document files
    - Set bucket as private (not publicly accessible)
    - Set file size limit to 10MB
    - Allow common document types (PDF, Word, Excel, PowerPoint, images, text, zip)

  2. Security
    - Files are private and require authentication to access
    - Access controlled through backend API
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false,
  10485760,
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