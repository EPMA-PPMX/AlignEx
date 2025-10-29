/*
  # Add impact columns to change_requests table

  1. Changes
    - Add `resource_impact` column to `change_requests` table
      - `resource_impact` (text) - Impact on resources
      - Default value: empty string
    - Add `risk_impact` column to `change_requests` table
      - `risk_impact` (text) - Impact on risks
      - Default value: empty string
    - Add `scope_impact` column to `change_requests` table
      - `scope_impact` (text) - Impact on scope
      - Default value: empty string
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'resource_impact'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN resource_impact text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'risk_impact'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN risk_impact text DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'change_requests' 
    AND column_name = 'scope_impact'
  ) THEN
    ALTER TABLE change_requests ADD COLUMN scope_impact text DEFAULT '';
  END IF;
END $$;