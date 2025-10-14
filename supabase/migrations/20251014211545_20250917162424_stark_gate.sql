/*
  # Create overview configurations table

  1. New Tables
    - `overview_configurations`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key to project_templates)
      - `sections` (jsonb, stores section configuration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `overview_configurations` table
    - Add policy for authenticated users to manage configurations

  3. Changes
    - Create table to store overview page configurations
    - Link configurations to project templates
    - Store section and field data as JSON
*/

CREATE TABLE IF NOT EXISTS overview_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(template_id)
);

ALTER TABLE overview_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage overview configurations"
  ON overview_configurations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_overview_configurations_updated_at
  BEFORE UPDATE ON overview_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_overview_configurations_template_id 
  ON overview_configurations(template_id);