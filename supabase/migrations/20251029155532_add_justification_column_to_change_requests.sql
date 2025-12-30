/*
  # Add justification column to change_requests table

  1. Changes
    - Add `justification` column to `change_requests` table
      - `justification` (text) - Reason or justification for the change request
      - Default value: empty string
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'justification'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN justification text DEFAULT '';
  END IF;
END $$;