/*
  # Add description column to custom_fields table

  1. Changes
    - Add field_description column to custom_fields table to store field descriptions
    - This will be displayed under field labels to help users understand what to enter
  
  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Add description column to custom_fields
ALTER TABLE custom_fields 
ADD COLUMN IF NOT EXISTS field_description TEXT;
