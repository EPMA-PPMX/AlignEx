/*
  # Add 'task' entity type to custom_fields

  1. Changes
    - Update the entity_type constraint to include 'task' as a valid value
    - This allows custom fields to be created for tasks in addition to projects and resources

  2. Notes
    - Existing data is not affected
    - The constraint now accepts 'project', 'resource', or 'task'
*/

-- Drop the existing constraint
ALTER TABLE custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_entity_type_check;

-- Add the updated constraint with 'task' included
ALTER TABLE custom_fields 
ADD CONSTRAINT custom_fields_entity_type_check 
CHECK (entity_type IN ('project', 'resource', 'task'));