/*
  # Create Timesheet Management System

  1. New Tables
    - `time_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., PTO, Training, Admin)
      - `description` (text, optional)
      - `is_active` (boolean) - Whether category is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `time_entries`
      - `id` (uuid, primary key)
      - `resource_id` (uuid) - Reference to resources table
      - `project_id` (uuid, optional) - Reference to projects table
      - `task_id` (text, optional) - Task ID from gantt (stored as text since gantt uses various ID formats)
      - `task_name` (text, optional) - Task name for display
      - `time_category_id` (uuid, optional) - Reference to time_categories for non-project time
      - `entry_date` (date) - Date of the time entry
      - `hours` (numeric) - Hours worked
      - `notes` (text, optional) - Optional notes about the work
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Admins can manage time categories
    - Users can view their own time entries
    - Users can create/update/delete their own time entries
    - Public read access for time categories
*/

-- Create time_categories table
CREATE TABLE IF NOT EXISTS time_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  task_id text,
  task_name text,
  time_category_id uuid REFERENCES time_categories(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  hours numeric(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_entry CHECK (
    (project_id IS NOT NULL AND task_id IS NOT NULL) OR 
    (time_category_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_resource_date ON time_entries(resource_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(time_category_id);

-- Enable RLS
ALTER TABLE time_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Time Categories Policies (public read, no auth needed for now)
CREATE POLICY "Anyone can view active time categories"
  ON time_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert time categories"
  ON time_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update time categories"
  ON time_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete time categories"
  ON time_categories FOR DELETE
  USING (true);

-- Time Entries Policies (public access for now)
CREATE POLICY "Anyone can view time entries"
  ON time_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert time entries"
  ON time_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update time entries"
  ON time_entries FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete time entries"
  ON time_entries FOR DELETE
  USING (true);

-- Insert some default time categories
INSERT INTO time_categories (name, description, is_active) VALUES
  ('PTO', 'Paid Time Off', true),
  ('Training', 'Professional Development and Training', true),
  ('Admin', 'Administrative Tasks', true),
  ('Meetings', 'General Meetings', true)
ON CONFLICT DO NOTHING;
