/*
  # Add Project Status column to Projects table

  1. Changes
    - Add `status` column to `projects` table with default value 'In-Progress'
    - Column allows common project statuses
    - Default value is automatically set when creating new projects

  2. Security
    - No changes to existing RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status text DEFAULT 'In-Progress';
  END IF;
END $$;

-- Add a check constraint to ensure valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'projects_status_check'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_status_check 
    CHECK (status IN ('Planning', 'In-Progress', 'Completed', 'On-Hold', 'Cancelled'));
  END IF;
END $$;