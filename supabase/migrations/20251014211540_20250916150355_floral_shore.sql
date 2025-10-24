/*
  # Create project templates table

  1. New Tables
    - `project_templates`
      - `id` (uuid, primary key)
      - `template_name` (text, required)
      - `template_description` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_templates` table
    - Add policy for authenticated users to manage templates

  3. Changes
    - Add trigger for automatic updated_at timestamp
*/

CREATE TABLE IF NOT EXISTS project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage project templates"
  ON project_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_project_templates_name ON project_templates (template_name);

CREATE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();