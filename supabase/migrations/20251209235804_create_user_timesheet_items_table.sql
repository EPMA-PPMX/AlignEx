/*
  # Create User Timesheet Items Table
  
  This table stores persistent timesheet items for each user.
  Items added to a user's timesheet will appear every week until marked as completed.
  
  1. New Tables
    - `user_timesheet_items`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, optional) - User identifier
      - `user_email` (text, required) - User email for identification
      - `item_type` (text) - Type: 'project', 'initiation', 'category'
      - `project_id` (uuid, optional) - References projects table
      - `initiation_request_id` (uuid, optional) - References project_initiation_requests
      - `non_project_category_id` (uuid, optional) - References non_project_work_categories
      - `is_completed` (boolean) - Whether user marked this item as completed
      - `added_date` (date) - When item was added to timesheet
      - `completed_date` (date, optional) - When item was marked completed
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `user_timesheet_items` table
    - Add policies for anonymous access (temporary for development)
  
  3. Indexes
    - Index on user_email for quick lookups
    - Index on is_completed for filtering active items
    - Composite index on (user_email, is_completed) for common queries
  
  4. Constraints
    - At least one of project_id, initiation_request_id, or non_project_category_id must be set
  
  5. Notes
    - Items appear on timesheet until marked completed
    - Users can add active projects, initiation requests, or non-project categories
    - Marking as completed hides the item from future timesheets
*/

CREATE TABLE IF NOT EXISTS user_timesheet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('project', 'initiation', 'category')),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  initiation_request_id uuid REFERENCES project_initiation_requests(id) ON DELETE CASCADE,
  non_project_category_id uuid REFERENCES non_project_work_categories(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  added_date date DEFAULT CURRENT_DATE,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure at least one reference is set
  CONSTRAINT check_item_reference CHECK (
    (project_id IS NOT NULL AND initiation_request_id IS NULL AND non_project_category_id IS NULL) OR
    (project_id IS NULL AND initiation_request_id IS NOT NULL AND non_project_category_id IS NULL) OR
    (project_id IS NULL AND initiation_request_id IS NULL AND non_project_category_id IS NOT NULL)
  ),
  
  -- Prevent duplicate items per user
  CONSTRAINT unique_user_item UNIQUE (user_email, item_type, project_id, initiation_request_id, non_project_category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_user_email ON user_timesheet_items(user_email);
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_completed ON user_timesheet_items(is_completed);
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_user_active ON user_timesheet_items(user_email, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_project ON user_timesheet_items(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_initiation ON user_timesheet_items(initiation_request_id) WHERE initiation_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_timesheet_items_category ON user_timesheet_items(non_project_category_id) WHERE non_project_category_id IS NOT NULL;

-- Enable RLS
ALTER TABLE user_timesheet_items ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (should be restricted in production)
CREATE POLICY "Allow anonymous read access to user_timesheet_items"
  ON user_timesheet_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to user_timesheet_items"
  ON user_timesheet_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to user_timesheet_items"
  ON user_timesheet_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to user_timesheet_items"
  ON user_timesheet_items FOR DELETE
  TO anon
  USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_timesheet_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_timesheet_items_updated_at
  BEFORE UPDATE ON user_timesheet_items
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timesheet_items_updated_at();

-- Trigger to set completed_date when is_completed changes to true
CREATE OR REPLACE FUNCTION set_user_timesheet_item_completed_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_user_timesheet_item_completed_date
  BEFORE UPDATE ON user_timesheet_items
  FOR EACH ROW
  EXECUTE FUNCTION set_user_timesheet_item_completed_date();