/*
  # Add Start Date to Project Templates

  1. Changes
    - Add `start_date` column to `project_templates` table
    - This allows each project type to have a default start date
    - The field is optional (nullable) and can be used when creating new projects

  2. Notes
    - Existing templates will have null start_date by default
    - New projects can inherit the start_date from their template
*/

-- Add start_date column to project_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_templates' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE project_templates ADD COLUMN start_date date;
  END IF;
END $$;
