/*
  # Make task_name Column Nullable

  The project_tasks table stores complete Gantt data in the task_data JSONB column.
  Individual columns like task_name are optional and used for direct SQL queries,
  but the primary data source is the task_data column.

  1. Changes
    - Remove NOT NULL constraint from task_name
    - Make all individual task columns nullable since task_data is the source of truth

  2. Notes
    - The task_data JSONB column contains the complete task information
    - Individual columns are denormalized for convenience but not required
    - This allows the Gantt component to store data without populating every column
*/

-- Make task_name nullable
ALTER TABLE project_tasks
ALTER COLUMN task_name DROP NOT NULL;

-- Add comment explaining the data model
COMMENT ON TABLE project_tasks IS 'Stores project tasks. Primary data is in task_data JSONB column. Individual columns are optional and used for direct SQL queries.';
