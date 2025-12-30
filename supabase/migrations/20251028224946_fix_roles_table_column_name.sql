/*
  # Fix roles table column naming

  1. Changes
    - Rename `title` column to `name` to match the expected schema
    - Ensure the column is unique and not null
  
  2. Notes
    - This aligns the database schema with the application code expectations
    - Existing role data will be preserved during the rename
*/

DO $$
BEGIN
  -- Rename title column to name if title exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'title'
  ) THEN
    ALTER TABLE roles RENAME COLUMN title TO name;
  END IF;
END $$;

-- Ensure name column has unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'roles_name_key'
    AND table_name = 'roles'
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
  END IF;
END $$;