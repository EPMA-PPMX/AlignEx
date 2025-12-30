/*
  # Create Timesheet Submissions Table
  
  This table tracks weekly timesheet submissions and their approval status.
  Users submit timesheets for a given week, which are then reviewed by project managers.
  
  1. New Tables
    - `timesheet_submissions`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, optional) - User identifier
      - `user_email` (text, required) - User email for identification
      - `week_start_date` (date, required) - Start of the week (Sunday)
      - `week_end_date` (date, required) - End of the week (Saturday)
      - `status` (text, required) - Status: 'submitted', 'approved', 'rejected', 'recalled'
      - `total_hours` (numeric) - Total hours submitted for the week
      - `billable_hours` (numeric) - Total billable hours
      - `non_billable_hours` (numeric) - Total non-billable hours
      - `submitted_at` (timestamptz) - When timesheet was submitted
      - `recalled_at` (timestamptz, optional) - When timesheet was recalled
      - `reviewed_by` (text, optional) - Email of reviewer (project manager)
      - `reviewed_at` (timestamptz, optional) - When review was completed
      - `reviewer_comments` (text, optional) - Comments from reviewer
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `timesheet_submissions` table
    - Add policies for anonymous access (temporary for development)
  
  3. Indexes
    - Index on user_email for quick lookups
    - Index on status for filtering
    - Composite index on (user_email, week_start_date) for unique constraint
    - Index on week_start_date for date-based queries
  
  4. Constraints
    - Unique constraint on (user_email, week_start_date) - one submission per user per week
    - Check constraint to ensure week_end_date is after week_start_date
  
  5. Notes
    - Users submit timesheets weekly
    - Project managers review and approve/reject
    - Users can recall submitted timesheets to make edits
    - Once submitted, timesheet entries for that week are locked
*/

CREATE TABLE IF NOT EXISTS timesheet_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected', 'recalled')),
  total_hours numeric DEFAULT 0,
  billable_hours numeric DEFAULT 0,
  non_billable_hours numeric DEFAULT 0,
  submitted_at timestamptz,
  recalled_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  reviewer_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure week_end_date is after week_start_date
  CONSTRAINT check_week_dates CHECK (week_end_date > week_start_date),
  
  -- One submission per user per week
  CONSTRAINT unique_user_week UNIQUE (user_email, week_start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timesheet_submissions_user_email ON timesheet_submissions(user_email);
CREATE INDEX IF NOT EXISTS idx_timesheet_submissions_status ON timesheet_submissions(status);
CREATE INDEX IF NOT EXISTS idx_timesheet_submissions_week_start ON timesheet_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_submissions_user_week ON timesheet_submissions(user_email, week_start_date);
CREATE INDEX IF NOT EXISTS idx_timesheet_submissions_reviewed_by ON timesheet_submissions(reviewed_by) WHERE reviewed_by IS NOT NULL;

-- Enable RLS
ALTER TABLE timesheet_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to timesheet_submissions"
  ON timesheet_submissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to timesheet_submissions"
  ON timesheet_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to timesheet_submissions"
  ON timesheet_submissions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to timesheet_submissions"
  ON timesheet_submissions FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_timesheet_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_timesheet_submissions_updated_at
  BEFORE UPDATE ON timesheet_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_submissions_updated_at();

-- Add a column to timesheet_entries to link to submission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'submission_id'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN submission_id uuid REFERENCES timesheet_submissions(id) ON DELETE SET NULL;
    CREATE INDEX idx_timesheet_entries_submission ON timesheet_entries(submission_id) WHERE submission_id IS NOT NULL;
  END IF;
END $$;