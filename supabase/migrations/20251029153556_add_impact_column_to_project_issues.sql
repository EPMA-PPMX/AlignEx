/*
  # Add impact column to project_issues table

  1. Changes
    - Add `impact` column to `project_issues` table
      - `impact` (text) - Impact level of the issue (Low, Medium, High, Critical)
      - Default value: 'Medium'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_issues' 
    AND column_name = 'impact'
  ) THEN
    ALTER TABLE project_issues ADD COLUMN impact text DEFAULT 'Medium';
  END IF;
END $$;