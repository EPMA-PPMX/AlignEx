/*
  # Add attachments column to change_requests table

  1. Changes
    - Add `attachments` column to `change_requests` table
      - `attachments` (jsonb) - Array of attachment information (file names, paths, URLs)
      - Default value: empty array '[]'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'attachments'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;