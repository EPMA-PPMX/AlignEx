/*
  # Create project field values table

  1. New Tables
    - `project_field_values`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `field_id` (text, references the field ID from overview configuration)
      - `field_value` (jsonb, stores the actual field value)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_field_values` table
    - Add policy for authenticated users to manage their project field values

  3. Indexes
    - Index on project_id for fast lookups
    - Unique constraint on project_id + field_id combination
*/

CREATE TABLE IF NOT EXISTS project_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field_id text NOT NULL,
  field_value jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_field_values_project_id ON project_field_values(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_field_values_unique ON project_field_values(project_id, field_id);

-- Enable RLS
ALTER TABLE project_field_values ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage project field values"
  ON project_field_values
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_project_field_values_updated_at'
  ) THEN
    CREATE TRIGGER update_project_field_values_updated_at
      BEFORE UPDATE ON project_field_values
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;