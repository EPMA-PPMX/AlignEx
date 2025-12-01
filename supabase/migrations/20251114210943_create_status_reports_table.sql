/*
  # Create Status Reports Tables

  1. New Tables
    - `status_reports`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `week_ending_date` (date) - The Friday of the week being reported
      - `status` (text) - draft, submitted, approved
      - `status_comment` (text) - Overall status narrative
      - `submitted_by` (uuid) - User who created/submitted the report
      - `submitted_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `status_report_risks`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `risk_id` (uuid, nullable, foreign key to project_risks) - Link to original risk if updating existing
      - `title` (text)
      - `description` (text)
      - `probability` (text) - low, medium, high
      - `impact` (text) - low, medium, high
      - `mitigation_plan` (text)
      - `status` (text) - open, mitigated, closed
      - `is_new` (boolean) - Whether this is a new risk added during status report
      - `created_at` (timestamptz)
    
    - `status_report_issues`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `issue_id` (uuid, nullable, foreign key to project_issues)
      - `title` (text)
      - `description` (text)
      - `severity` (text) - low, medium, high, critical
      - `status` (text) - open, in_progress, resolved, closed
      - `impact` (text)
      - `is_new` (boolean)
      - `created_at` (timestamptz)
    
    - `status_report_change_requests`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `change_request_id` (uuid, nullable, foreign key to change_requests)
      - `title` (text)
      - `description` (text)
      - `status` (text) - pending, approved, rejected
      - `cost_impact` (numeric)
      - `schedule_impact` (text)
      - `is_new` (boolean)
      - `created_at` (timestamptz)
    
    - `status_report_budget`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `category` (text)
      - `planned_amount` (numeric)
      - `actual_amount` (numeric)
      - `forecast_amount` (numeric)
      - `variance` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `status_report_tasks`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `task_id` (uuid, nullable, foreign key to project_tasks)
      - `task_name` (text)
      - `assigned_to` (text)
      - `previous_progress` (numeric) - Progress % at start of week
      - `current_progress` (numeric) - Progress % at end of week
      - `status` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `status_report_team_availability`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `resource_id` (uuid, foreign key to resources)
      - `resource_name` (text)
      - `out_of_office_dates` (jsonb) - Array of date ranges
      - `availability_percentage` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `status_report_benefits`
      - `id` (uuid, primary key)
      - `status_report_id` (uuid, foreign key)
      - `benefit_type` (text)
      - `description` (text)
      - `target_value` (numeric)
      - `actual_value` (numeric)
      - `realization_date` (date)
      - `status` (text) - planned, in_progress, realized
      - `notes` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous users (for now)
*/

-- Status Reports main table
CREATE TABLE IF NOT EXISTS status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  week_ending_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  status_comment text DEFAULT '',
  submitted_by uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, week_ending_date)
);

ALTER TABLE status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_reports"
  ON status_reports FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_reports"
  ON status_reports FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_reports"
  ON status_reports FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_reports"
  ON status_reports FOR DELETE
  TO anon
  USING (true);

-- Status Report Risks
CREATE TABLE IF NOT EXISTS status_report_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  risk_id uuid REFERENCES project_risks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  probability text DEFAULT 'medium' CHECK (probability IN ('low', 'medium', 'high')),
  impact text DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  mitigation_plan text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open', 'mitigated', 'closed')),
  is_new boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_risks"
  ON status_report_risks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_risks"
  ON status_report_risks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_risks"
  ON status_report_risks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_risks"
  ON status_report_risks FOR DELETE
  TO anon
  USING (true);

-- Status Report Issues
CREATE TABLE IF NOT EXISTS status_report_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  issue_id uuid REFERENCES project_issues(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  impact text DEFAULT '',
  is_new boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_issues"
  ON status_report_issues FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_issues"
  ON status_report_issues FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_issues"
  ON status_report_issues FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_issues"
  ON status_report_issues FOR DELETE
  TO anon
  USING (true);

-- Status Report Change Requests
CREATE TABLE IF NOT EXISTS status_report_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  change_request_id uuid REFERENCES change_requests(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_review')),
  cost_impact numeric DEFAULT 0,
  schedule_impact text DEFAULT '',
  is_new boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_change_requests"
  ON status_report_change_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_change_requests"
  ON status_report_change_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_change_requests"
  ON status_report_change_requests FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_change_requests"
  ON status_report_change_requests FOR DELETE
  TO anon
  USING (true);

-- Status Report Budget
CREATE TABLE IF NOT EXISTS status_report_budget (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  planned_amount numeric DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  forecast_amount numeric DEFAULT 0,
  variance numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_budget"
  ON status_report_budget FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_budget"
  ON status_report_budget FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_budget"
  ON status_report_budget FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_budget"
  ON status_report_budget FOR DELETE
  TO anon
  USING (true);

-- Status Report Tasks
CREATE TABLE IF NOT EXISTS status_report_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL,
  task_name text NOT NULL,
  assigned_to text DEFAULT '',
  previous_progress numeric DEFAULT 0,
  current_progress numeric DEFAULT 0,
  status text DEFAULT 'not_started',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_tasks"
  ON status_report_tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_tasks"
  ON status_report_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_tasks"
  ON status_report_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_tasks"
  ON status_report_tasks FOR DELETE
  TO anon
  USING (true);

-- Status Report Team Availability
CREATE TABLE IF NOT EXISTS status_report_team_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  resource_id uuid REFERENCES resources(id) ON DELETE CASCADE NOT NULL,
  resource_name text NOT NULL,
  out_of_office_dates jsonb DEFAULT '[]'::jsonb,
  availability_percentage numeric DEFAULT 100,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_team_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_team_availability"
  ON status_report_team_availability FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_team_availability"
  ON status_report_team_availability FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_team_availability"
  ON status_report_team_availability FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_team_availability"
  ON status_report_team_availability FOR DELETE
  TO anon
  USING (true);

-- Status Report Benefits
CREATE TABLE IF NOT EXISTS status_report_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_report_id uuid REFERENCES status_reports(id) ON DELETE CASCADE NOT NULL,
  benefit_type text NOT NULL,
  description text DEFAULT '',
  target_value numeric DEFAULT 0,
  actual_value numeric DEFAULT 0,
  realization_date date,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'realized')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE status_report_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to status_report_benefits"
  ON status_report_benefits FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to status_report_benefits"
  ON status_report_benefits FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to status_report_benefits"
  ON status_report_benefits FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to status_report_benefits"
  ON status_report_benefits FOR DELETE
  TO anon
  USING (true);