/*
  # Create Resource Field Values Table

  1. New Tables
    - `resource_field_values`
      - `id` (uuid, primary key) - Unique identifier
      - `resource_id` (uuid, foreign key) - Reference to resources table
      - `field_id` (uuid, foreign key) - Reference to custom_fields table
      - `value` (text) - The field value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `resource_field_values` table
    - Add policies for anonymous access (should be restricted to authenticated admins in production)

  3. Constraints
    - Unique constraint on (resource_id, field_id) to prevent duplicate values
    - Foreign key constraints with CASCADE delete

  4. Indexes
    - Index on resource_id for fast lookups
    - Index on field_id for filtering by field type
*/

CREATE TABLE IF NOT EXISTS resource_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_resource_field UNIQUE (resource_id, field_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resource_field_values_resource_id ON resource_field_values(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_field_values_field_id ON resource_field_values(field_id);

-- Enable RLS
ALTER TABLE resource_field_values ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to resource field values"
  ON resource_field_values FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to resource field values"
  ON resource_field_values FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to resource field values"
  ON resource_field_values FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to resource field values"
  ON resource_field_values FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resource_field_values_updated_at
  BEFORE UPDATE ON resource_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_field_values_updated_at();