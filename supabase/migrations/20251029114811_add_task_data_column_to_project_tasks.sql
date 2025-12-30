/*
  # Add task_data Column to project_tasks Table
  
  The project_tasks table needs to store the complete Gantt chart data structure
  including tasks, links, and other metadata required by dhtmlx-gantt.
  
  1. Changes
    - Add task_data JSONB column to store complete Gantt data
    - Keep existing columns for backward compatibility and direct queries
    - Add index on task_data for JSONB queries
  
  2. Notes
    - The task_data column will store the full Gantt chart structure including:
      - data: array of tasks
      - links: array of task dependencies
      - Additional Gantt configuration
    - Individual columns (task_name, start_date, etc.) can still be used for simple queries
    - The task_data column is the primary storage for the Gantt component
*/

-- Add task_data column if it doesn't exist
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS task_data jsonb DEFAULT '{}'::jsonb;

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_project_tasks_task_data ON project_tasks USING gin(task_data);

-- Add comment to explain the column
COMMENT ON COLUMN project_tasks.task_data IS 'Complete Gantt chart data structure including tasks, links, and metadata for dhtmlx-gantt';
