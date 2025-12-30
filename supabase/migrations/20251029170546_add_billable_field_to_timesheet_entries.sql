/*
  # Add Billable Field to Timesheet Entries

  1. Changes
    - Add `is_billable` (boolean) column to timesheet_entries table
    - Default value is false (non-billable)
    - This allows users to track whether time is billable or non-billable

  2. Notes
    - No data loss as we're only adding a new column
    - Existing entries will default to non-billable
*/

-- Add is_billable column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'is_billable'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN is_billable boolean DEFAULT false;
  END IF;
END $$;