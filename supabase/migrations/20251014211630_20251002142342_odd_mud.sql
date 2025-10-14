/*
  # Create change requests table

  1. New Tables
    - `change_requests`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `title` (text, required)
      - `type` (text, required - enum values)
      - `description` (text, required)
      - `justification` (text, required)
      - `scope_impact` (text, required - Low/Medium/High)
      - `cost_impact` (text, optional)
      - `risk_impact` (text, required - Low/Medium/High)
      - `resource_impact` (text, required - Low/Medium/High)
      - `attachments` (text, optional)
      - `status` (text, default 'Pending Review')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `change_requests` table
    - Add policy for authenticated users to manage change requests

  3. Indexes
    - Add indexes for project_id, status, and type for better query performance
*/

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  justification text NOT NULL,
  scope_impact text NOT NULL DEFAULT 'Low',
  cost_impact text,
  risk_impact text NOT NULL DEFAULT 'Low',
  resource_impact text NOT NULL DEFAULT 'Low',
  attachments text,
  status text NOT NULL DEFAULT 'Pending Review',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT change_requests_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  
  CONSTRAINT change_requests_type_check 
    CHECK (type IN ('Scope Change', 'Schedule Change', 'Budget Change', 'Resource Change', 'Quality Change')),
  
  CONSTRAINT change_requests_scope_impact_check 
    CHECK (scope_impact IN ('Low', 'Medium', 'High')),
  
  CONSTRAINT change_requests_risk_impact_check 
    CHECK (risk_impact IN ('Low', 'Medium', 'High')),
  
  CONSTRAINT change_requests_resource_impact_check 
    CHECK (resource_impact IN ('Low', 'Medium', 'High')),
  
  CONSTRAINT change_requests_status_check 
    CHECK (status IN ('Pending Review', 'Under Review', 'Approved', 'Rejected', 'Implemented'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_change_requests_project_id ON change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_type ON change_requests(type);

-- Enable Row Level Security
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage change requests
CREATE POLICY "Users can manage change requests"
  ON change_requests
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_change_requests_updated_at
  BEFORE UPDATE ON change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();