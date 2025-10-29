/*
  # Add type column to change_requests table

  1. Changes
    - Add `type` column to `change_requests` table
      - Type: text
      - Default: 'Scope Change'
      - Not null

  2. Notes
    - This column tracks the type of change request (e.g., Scope Change, Schedule Change, Budget Change)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'change_requests' AND column_name = 'type'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN type text NOT NULL DEFAULT 'Scope Change';
  END IF;
END $$;