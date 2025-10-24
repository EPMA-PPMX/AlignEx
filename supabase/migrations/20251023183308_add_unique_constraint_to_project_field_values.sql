/*
  # Add unique constraint to project_field_values

  1. Changes
    - Add unique constraint on (project_id, field_id) to prevent duplicate field values for the same project
    - This enables proper upsert operations when saving field values
  
  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Add unique constraint on project_id and field_id combination
ALTER TABLE project_field_values 
ADD CONSTRAINT project_field_values_project_field_unique 
UNIQUE (project_id, field_id);
