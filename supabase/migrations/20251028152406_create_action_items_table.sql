/*
  # Create Action Items Table

  1. New Tables
    - `action_items`
      - `id` (uuid, primary key) - Unique identifier for the action item
      - `title` (text) - Title of the action item
      - `description` (text, nullable) - Detailed description
      - `status` (text) - Status: 'not_started', 'in_progress', 'completed', 'blocked'
      - `priority` (text) - Priority level: 'low', 'medium', 'high', 'critical'
      - `assigned_to` (text, nullable) - Person or team assigned to the action
      - `due_date` (date, nullable) - Due date for completion
      - `project_id` (uuid, nullable) - Optional link to a project
      - `created_by` (text, nullable) - Creator of the action item
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `completed_at` (timestamptz, nullable) - Completion timestamp

  2. Security
    - Enable RLS on `action_items` table
    - Add policies for anonymous users to perform all operations
*/

CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to text,
  due_date date,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous users
CREATE POLICY "Allow anonymous users to read action items"
  ON action_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert action items"
  ON action_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update action items"
  ON action_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete action items"
  ON action_items FOR DELETE
  TO anon
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_action_items_project_id ON action_items(project_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON action_items(due_date);
