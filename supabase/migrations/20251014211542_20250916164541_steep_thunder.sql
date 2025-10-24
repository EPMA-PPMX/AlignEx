/*
  # Add template_id column to projects table

  1. Changes
    - Add `template_id` column to `projects` table
    - Create foreign key relationship with `project_templates` table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add template_id column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN template_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_template_id_fkey'
  ) THEN
    ALTER TABLE projects 
    ADD CONSTRAINT projects_template_id_fkey 
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);