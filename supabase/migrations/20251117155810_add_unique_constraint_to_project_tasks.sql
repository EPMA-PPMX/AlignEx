/*
  # Add unique constraint to project_tasks table
  
  1. Changes
    - Add unique constraint on project_id column in project_tasks table
    - This ensures each project can only have one task record
    - Prevents duplicate task records from being created
  
  2. Notes
    - Duplicates have already been cleaned up before this migration
    - Future inserts with duplicate project_id will fail
*/

-- Add unique constraint to project_id
ALTER TABLE project_tasks 
ADD CONSTRAINT project_tasks_project_id_unique 
UNIQUE (project_id);