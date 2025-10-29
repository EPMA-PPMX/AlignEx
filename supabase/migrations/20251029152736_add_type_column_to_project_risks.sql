/*
  # Add type column to project_risks table

  1. Changes
    - Add `type` column to `project_risks` table
      - `type` (text) - Type of risk (Risk, Issue, Opportunity, etc.)
      - Default value: 'Risk'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_risks' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE project_risks ADD COLUMN type text DEFAULT 'Risk';
  END IF;
END $$;