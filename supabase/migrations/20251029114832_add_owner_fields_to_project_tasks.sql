/*
  # Add Owner Fields to project_tasks Table
  
  Add owner tracking fields to project tasks to support task assignment
  to team members.
  
  1. Changes
    - Add owner_id column (references resources table)
    - Add owner_name column (denormalized for performance)
  
  2. Notes
    - owner_id is a foreign key to resources table
    - owner_name is denormalized to avoid joins on Gantt display
    - Both fields are optional (tasks can be unassigned)
*/

-- Add owner_id column
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES resources(id) ON DELETE SET NULL;

-- Add owner_name column (denormalized)
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS owner_name text;

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_project_tasks_owner_id ON project_tasks(owner_id);

-- Add comments
COMMENT ON COLUMN project_tasks.owner_id IS 'Resource assigned as owner of this task';
COMMENT ON COLUMN project_tasks.owner_name IS 'Denormalized owner name for Gantt chart display performance';
