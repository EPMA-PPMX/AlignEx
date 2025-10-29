/*
  # Add cost_impact column to change_requests table

  1. Changes
    - Add `cost_impact` column to `change_requests` table
      - `cost_impact` (numeric) - Financial impact of the change request
      - Default value: 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'cost_impact'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN cost_impact numeric DEFAULT 0;
  END IF;
END $$;