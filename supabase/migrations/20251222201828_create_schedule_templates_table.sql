/*
  # Create Schedule Templates Table
  
  1. New Tables
    - `schedule_templates`
      - `id` (uuid, primary key)
      - `template_name` (text) - Name of the schedule template
      - `template_description` (text) - Description of the template
      - `tasks_data` (jsonb) - JSON structure containing all tasks
      - `links_data` (jsonb) - JSON structure containing all task links (predecessors/successors)
      - `resources_data` (jsonb) - JSON structure containing resources
      - `resource_assignments_data` (jsonb) - JSON structure containing resource assignments
      - `created_by` (uuid) - User who created the template
      - `created_at` (timestamptz) - Timestamp of creation
      - `updated_at` (timestamptz) - Timestamp of last update
  
  2. Changes to Existing Tables
    - `project_templates`
      - Add `schedule_template_id` (uuid, nullable) - Links to a schedule template
  
  3. Security
    - Enable RLS on `schedule_templates` table
    - Add policies for authenticated users to manage schedule templates
  
  4. Notes
    - Tasks in templates are stored with progress set to 0%
    - Baselines are not stored in templates
    - Templates can be reused across multiple project types
*/

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_description text,
  tasks_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  links_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  resources_data jsonb DEFAULT '[]'::jsonb,
  resource_assignments_data jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for schedule_templates
CREATE POLICY "Users can view all schedule templates"
  ON schedule_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create schedule templates"
  ON schedule_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update schedule templates"
  ON schedule_templates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete schedule templates"
  ON schedule_templates
  FOR DELETE
  TO authenticated
  USING (true);

-- Add index on template name for faster searches
CREATE INDEX IF NOT EXISTS idx_schedule_templates_name ON schedule_templates (template_name);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_schedule_templates_updated_at
  BEFORE UPDATE ON schedule_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add schedule_template_id to project_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_templates' AND column_name = 'schedule_template_id'
  ) THEN
    ALTER TABLE project_templates ADD COLUMN schedule_template_id uuid REFERENCES schedule_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index on schedule_template_id for faster joins
CREATE INDEX IF NOT EXISTS idx_project_templates_schedule_template ON project_templates (schedule_template_id);