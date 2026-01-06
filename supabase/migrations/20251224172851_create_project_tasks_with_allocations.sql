/*
  Create Project Tasks Tables with Allocation Support

  1. New Tables
    - project_tasks: Stores task information including Gantt data
    - task_resource_assignments: Junction table for task-resource assignments with allocation percentages

  2. Security
    - Enable RLS on both tables
    - Allow anonymous access (matching other project tables)

  3. Features
    - Allocation percentage: Track how much of each resource is allocated to tasks
    - Supports multiple resources per task
    - Stores complete Gantt chart data in JSONB
*/

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_name text,
  start_date date,
  end_date date,
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  type text DEFAULT 'task' CHECK (type IN ('task', 'milestone', 'project')),
  parent_id uuid REFERENCES project_tasks(id) ON DELETE CASCADE,
  task_data jsonb DEFAULT '{}'::jsonb,
  owner_id text,
  owner_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for project_tasks
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_parent_id ON project_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_task_data ON project_tasks USING gin(task_data);

-- Enable RLS on project_tasks
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for project_tasks
CREATE POLICY "Allow anonymous read access to project_tasks"
  ON project_tasks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to project_tasks"
  ON project_tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to project_tasks"
  ON project_tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from project_tasks"
  ON project_tasks
  FOR DELETE
  TO anon
  USING (true);

-- Create task_resource_assignments table
CREATE TABLE IF NOT EXISTS task_resource_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  resource_id text NOT NULL,
  allocation_percentage numeric(5,2) DEFAULT 100.00 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(task_id, resource_id)
);

-- Create indexes for task_resource_assignments
CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_task_id ON task_resource_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_resource_assignments_resource_id ON task_resource_assignments(resource_id);

-- Enable RLS on task_resource_assignments
ALTER TABLE task_resource_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for task_resource_assignments
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
COMMENT ON TABLE project_tasks IS 'Stores project tasks and Gantt chart data';
COMMENT ON COLUMN project_tasks.task_data IS 'Complete Gantt chart data structure including tasks, links, and metadata';
COMMENT ON COLUMN project_tasks.owner_id IS 'Legacy field: Primary resource assigned to task';
COMMENT ON COLUMN project_tasks.owner_name IS 'Legacy field: Denormalized owner name for display';

COMMENT ON TABLE task_resource_assignments IS 'Junction table for many-to-many relationship between tasks and resources with allocation percentages';
COMMENT ON COLUMN task_resource_assignments.allocation_percentage IS 'Percentage of resource capacity allocated to this task (0-100)';