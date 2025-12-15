/*
  # Add selected task fields column to projects table

  1. Changes
    - Add `selected_task_fields` column to `projects` table
      - Type: jsonb (array of field IDs)
      - Default: empty array
      - Stores the IDs of custom fields selected to display in the Gantt task pane

  2. Purpose
    - Persist user's selection of which task-level custom fields to display
    - Maintains field selection when user navigates away and returns to project
*/

-- Add selected_task_fields column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'selected_task_fields'
  ) THEN
    ALTER TABLE projects ADD COLUMN selected_task_fields jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
