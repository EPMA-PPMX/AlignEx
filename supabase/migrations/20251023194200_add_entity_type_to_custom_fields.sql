/*
  # Add Entity Type to Custom Fields

  1. Changes
    - Add `entity_type` column to custom_fields table to distinguish between 'project' and 'resource' fields
    - Default existing fields to 'project' for backwards compatibility
    - Add index on entity_type for filtering performance

  2. Security
    - No RLS changes needed, existing policies remain in effect
*/

-- Add entity_type column to custom_fields
ALTER TABLE custom_fields 
ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'project' CHECK (entity_type IN ('project', 'resource'));

-- Create index for filtering by entity_type
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);