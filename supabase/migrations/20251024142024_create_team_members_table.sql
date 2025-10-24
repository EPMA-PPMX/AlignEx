/*
  # Create team_members table

  1. New Tables
    - `team_members`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `member_name` (text) - Full name of team member
      - `member_email` (text) - Email address
      - `role` (text) - Role in the project
      - `allocation_percentage` (integer) - Percentage of time allocated (0-100)
      - `start_date` (date) - When member joined project
      - `end_date` (date, nullable) - When member leaves project
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `team_members` table
    - Add policy for anonymous users to read team members
    - Add policy for anonymous users to insert team members
    - Add policy for anonymous users to update team members
    - Add policy for anonymous users to delete team members
*/

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  member_name text NOT NULL,
  member_email text NOT NULL,
  role text DEFAULT '',
  allocation_percentage integer DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to team_members"
  ON team_members
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to team_members"
  ON team_members
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to team_members"
  ON team_members
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to team_members"
  ON team_members
  FOR DELETE
  TO anon
  USING (true);