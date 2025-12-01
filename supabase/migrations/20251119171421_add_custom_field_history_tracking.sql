/*
  # Add Custom Field History Tracking

  1. Changes to custom_fields table
    - Add `track_history` boolean column to enable/disable history tracking per field
    - Defaults to false (no history tracking)

  2. New Tables
    - `project_field_value_history`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `field_id` (uuid, foreign key to custom_fields)
      - `field_value` (text, the value at this point in time)
      - `changed_by` (text, user who made the change)
      - `changed_at` (timestamp, when the change occurred)
      - `project_name` (text, snapshot of project name for reporting)
      - `field_name` (text, snapshot of field name for reporting)
      
  3. Security
    - Enable RLS on history table
    - Add policy for authenticated users to read history
    - Add policy for authenticated users to insert history
*/

-- Add track_history column to custom_fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_fields' AND column_name = 'track_history'
  ) THEN
    ALTER TABLE custom_fields ADD COLUMN track_history boolean DEFAULT false;
  END IF;
END $$;

-- Create project_field_value_history table
CREATE TABLE IF NOT EXISTS project_field_value_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  field_id uuid REFERENCES custom_fields(id) ON DELETE CASCADE,
  field_value text,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  project_name text NOT NULL,
  field_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_field_history_project_id ON project_field_value_history(project_id);
CREATE INDEX IF NOT EXISTS idx_field_history_field_id ON project_field_value_history(field_id);
CREATE INDEX IF NOT EXISTS idx_field_history_changed_at ON project_field_value_history(changed_at DESC);

-- Enable RLS
ALTER TABLE project_field_value_history ENABLE ROW LEVEL SECURITY;

-- Create policies for project_field_value_history
CREATE POLICY "Allow anonymous read access to field history"
  ON project_field_value_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to field history"
  ON project_field_value_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read access to field history"
  ON project_field_value_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert access to field history"
  ON project_field_value_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
