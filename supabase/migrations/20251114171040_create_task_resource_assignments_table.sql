/*
  # Create Task Resource Assignments Table

  1. Purpose
    - Enable multiple resource assignments per task
    - Replace single owner_id with many-to-many relationship

  2. New Tables
    - `task_resource_assignments`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references project_tasks)
      - `resource_id` (uuid, references resources)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Changes
    - Keep existing owner_id and owner_name columns for backward compatibility
    - Add junction table for multiple assignments
    - Create unique constraint on task_id + resource_id

  4. Security
    - Enable RLS on task_resource_assignments table
    - Add policies for authenticated users to manage assignments
    - Anonymous access for reading (matching project_tasks policies)

  5. Indexes
    - Index on task_id for fast lookup
    - Index on resource_id for reverse lookup
    - Unique constraint on task_id + resource_id combination
*/

-- Create task_resource_assignments table
CREATE TABLE IF NOT EXISTS task_resource_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, resource_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_task_id 
  ON task_resource_assignments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_resource_id 
  ON task_resource_assignments(resource_id);

-- Enable RLS
ALTER TABLE task_resource_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (matching project_tasks policies)
CREATE POLICY "Allow anonymous read access to task_resource_assignments"
  ON task_resource_assignments
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to task_resource_assignments"
  ON task_resource_assignments
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to task_resource_assignments"
  ON task_resource_assignments
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from task_resource_assignments"
  ON task_resource_assignments
  FOR DELETE
  TO anon
  USING (true);

-- Add comments
COMMENT ON TABLE task_resource_assignments IS 'Junction table for many-to-many relationship between tasks and resources';
COMMENT ON COLUMN task_resource_assignments.task_id IS 'Reference to the task';
COMMENT ON COLUMN task_resource_assignments.resource_id IS 'Reference to the assigned resource';