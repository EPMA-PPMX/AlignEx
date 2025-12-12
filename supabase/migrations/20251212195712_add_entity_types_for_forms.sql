/*
  # Add Entity Types for Risk, Issue, and Change Request Forms
  
  1. Changes
    - Update `entity_type` constraint on custom_fields to include 'risk', 'issue', 'change_request', and 'task'
    - Allows users to create custom fields for these entity types
  
  2. Notes
    - Existing data is preserved
    - No breaking changes to existing functionality
*/

-- Drop the existing constraint
ALTER TABLE custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_entity_type_check;

-- Add updated constraint with new entity types
ALTER TABLE custom_fields 
ADD CONSTRAINT custom_fields_entity_type_check 
CHECK (entity_type IN ('project', 'resource', 'task', 'risk', 'issue', 'change_request'));
