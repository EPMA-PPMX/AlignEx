/*
  # Add Cost field type to custom_fields

  1. Changes
    - Drop existing field_type check constraint
    - Add new check constraint that includes 'cost' field type
  
  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Drop the existing constraint
ALTER TABLE custom_fields 
DROP CONSTRAINT IF EXISTS custom_fields_field_type_check;

-- Add the new constraint with 'cost' included
ALTER TABLE custom_fields 
ADD CONSTRAINT custom_fields_field_type_check 
CHECK (field_type = ANY (ARRAY['text'::text, 'number'::text, 'cost'::text, 'email'::text, 'date'::text, 'dropdown'::text, 'radio'::text, 'checkbox'::text, 'textarea'::text]));
