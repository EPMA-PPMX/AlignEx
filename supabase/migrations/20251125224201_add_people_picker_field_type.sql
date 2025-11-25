/*
  # Add people_picker field type to custom fields

  1. Changes
    - Add 'people_picker' to the allowed field_type values in custom_fields table
    - This allows custom fields to use a people picker component for resource selection
  
  2. Purpose
    - Enable selection of resources (people) from a dropdown for fields like "Project Manager"
    - Replaces email field type with a more user-friendly people picker interface
*/

ALTER TABLE custom_fields DROP CONSTRAINT IF EXISTS custom_fields_field_type_check;

ALTER TABLE custom_fields ADD CONSTRAINT custom_fields_field_type_check 
  CHECK (field_type IN ('text', 'number', 'email', 'date', 'dropdown', 'radio', 'checkbox', 'textarea', 'cost', 'people_picker'));
