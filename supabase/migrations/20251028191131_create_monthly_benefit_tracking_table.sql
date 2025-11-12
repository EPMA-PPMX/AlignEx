/*
  # Create Monthly Benefit Tracking Table

  1. New Tables
    - `monthly_benefit_tracking`
      - `id` (uuid, primary key) - Unique identifier
      - `project_id` (uuid, foreign key) - References projects table
      - `priority_id` (uuid, foreign key) - References organizational_priorities table
      - `month_year` (date) - Month and year for this tracking entry (stored as first day of month)
      - `estimated_benefit_value` (numeric) - Estimated dollar value (read-only, from initiation)
      - `actual_benefit_value` (numeric) - Actual dollar value achieved
      - `notes` (text) - Additional notes about the benefit
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `monthly_benefit_tracking` table
    - Add policies for anonymous users to perform all operations

  3. Indexes
    - Add index on project_id for faster queries
    - Add index on priority_id for faster queries
    - Add index on month_year for date-based filtering
    - Add unique constraint on (project_id, priority_id, month_year) to prevent duplicates

  4. Important Notes
    - This table tracks actual benefits on a monthly basis
    - The estimated_benefit_value is copied from project_priority_impacts.planned_impact during project creation
    - Project managers update actual_benefit_value monthly
    - month_year uses the first day of the month for consistency
*/

CREATE TABLE IF NOT EXISTS monthly_benefit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  priority_id uuid NOT NULL REFERENCES organizational_priorities(id) ON DELETE CASCADE,
  month_year date NOT NULL,
  estimated_benefit_value numeric(15,2) DEFAULT 0,
  actual_benefit_value numeric(15,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, priority_id, month_year)
);

-- Enable RLS
ALTER TABLE monthly_benefit_tracking ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_monthly_benefit_tracking_project_id 
  ON monthly_benefit_tracking(project_id);

CREATE INDEX IF NOT EXISTS idx_monthly_benefit_tracking_priority_id 
  ON monthly_benefit_tracking(priority_id);

CREATE INDEX IF NOT EXISTS idx_monthly_benefit_tracking_month_year 
  ON monthly_benefit_tracking(month_year);

-- Policies for anonymous users
CREATE POLICY "Anonymous users can read monthly benefit tracking"
  ON monthly_benefit_tracking FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create monthly benefit tracking"
  ON monthly_benefit_tracking FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update monthly benefit tracking"
  ON monthly_benefit_tracking FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete monthly benefit tracking"
  ON monthly_benefit_tracking FOR DELETE
  TO anon
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_monthly_benefit_tracking_updated_at
  BEFORE UPDATE ON monthly_benefit_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
