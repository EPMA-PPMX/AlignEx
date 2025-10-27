/*
  # Create project tasks table for Gantt chart

  1. New Tables
    - `project_tasks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `task_data` (jsonb, stores task information)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_tasks` table
    - Add policy for anonymous users to read tasks
    - Add policy for anonymous users to insert tasks
    - Add policy for anonymous users to update tasks
    - Add policy for anonymous users to delete tasks

  3. Notes
    - task_data will store JSON with structure: {"data": [{"id": 1, "text": "Task", "start_date": "2025-10-20", "duration": 5}]}
    - Each project will have one record with all its tasks in the JSON
*/

-- Create project_tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_data jsonb NOT NULL DEFAULT '{"data": []}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to ensure one task record per project
CREATE UNIQUE INDEX IF NOT EXISTS project_tasks_project_id_idx ON project_tasks(project_id);

-- Enable RLS
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous users
CREATE POLICY "Anonymous users can read project tasks"
  ON project_tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert project tasks"
  ON project_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update project tasks"
  ON project_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete project tasks"
  ON project_tasks FOR DELETE
  TO anon
  USING (true);
