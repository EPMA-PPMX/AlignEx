/*
  # Add type column to project_issues table

  1. Changes
    - Add `type` column to `project_issues` table
      - `type` (text) - Type of issue (Issue, Bug, Defect, Problem, etc.)
      - Default value: 'Issue'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'project_issues' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE project_issues ADD COLUMN type text DEFAULT 'Issue';
  END IF;
END $$;