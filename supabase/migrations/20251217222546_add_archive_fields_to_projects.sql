/*
  # Add Archive Fields to Projects Table

  1. Changes
    - Add `archived` column (boolean, default false) to track if project is archived
    - Add `archived_at` column (timestamptz, nullable) to track when project was archived
    - Add `archived_by` column (uuid, nullable) to track who archived the project
  
  2. Purpose
    - Enable archiving completed or closed projects
    - Hide archived projects from general view while keeping them accessible
    - Track archival metadata for audit purposes
  
  3. Notes
    - Archived projects can be unarchived by setting archived to false
    - No data is deleted, only hidden from default views
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'archived'
  ) THEN
    ALTER TABLE projects ADD COLUMN archived boolean DEFAULT false NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN archived_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'archived_by'
  ) THEN
    ALTER TABLE projects ADD COLUMN archived_by uuid;
  END IF;
END $$;

-- Create an index on archived for faster filtering
CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
