/*
  # Create Field Values Tables for Risk, Issue, and Change Request Forms
  
  1. New Tables
    - `risk_field_values`
      - `id` (uuid, primary key) - Unique identifier
      - `risk_id` (uuid, foreign key) - Reference to project_risks table
      - `field_id` (uuid, foreign key) - Reference to custom_fields table
      - `value` (text) - The field value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `issue_field_values`
      - `id` (uuid, primary key) - Unique identifier
      - `issue_id` (uuid, foreign key) - Reference to project_issues table
      - `field_id` (uuid, foreign key) - Reference to custom_fields table
      - `value` (text) - The field value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `change_request_field_values`
      - `id` (uuid, primary key) - Unique identifier
      - `change_request_id` (uuid, foreign key) - Reference to change_requests table
      - `field_id` (uuid, foreign key) - Reference to custom_fields table
      - `value` (text) - The field value
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous access (to be restricted to authenticated users in production)
  
  3. Constraints
    - Unique constraint on entity_id and field_id to prevent duplicate values
    - Foreign key constraints with CASCADE delete
  
  4. Indexes
    - Index on entity_id for fast lookups
    - Index on field_id for filtering by field type
*/

-- Risk Field Values Table
CREATE TABLE IF NOT EXISTS risk_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id uuid NOT NULL REFERENCES project_risks(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_risk_field UNIQUE (risk_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_risk_field_values_risk_id ON risk_field_values(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_field_values_field_id ON risk_field_values(field_id);

ALTER TABLE risk_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to risk field values"
  ON risk_field_values FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to risk field values"
  ON risk_field_values FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to risk field values"
  ON risk_field_values FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to risk field values"
  ON risk_field_values FOR DELETE
  TO anon
  USING (true);

-- Issue Field Values Table
CREATE TABLE IF NOT EXISTS issue_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES project_issues(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_issue_field UNIQUE (issue_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_issue_field_values_issue_id ON issue_field_values(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_field_values_field_id ON issue_field_values(field_id);

ALTER TABLE issue_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to issue field values"
  ON issue_field_values FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to issue field values"
  ON issue_field_values FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to issue field values"
  ON issue_field_values FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to issue field values"
  ON issue_field_values FOR DELETE
  TO anon
  USING (true);

-- Change Request Field Values Table
CREATE TABLE IF NOT EXISTS change_request_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_change_request_field UNIQUE (change_request_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_change_request_field_values_cr_id ON change_request_field_values(change_request_id);
CREATE INDEX IF NOT EXISTS idx_change_request_field_values_field_id ON change_request_field_values(field_id);

ALTER TABLE change_request_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to change request field values"
  ON change_request_field_values FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert access to change request field values"
  ON change_request_field_values FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to change request field values"
  ON change_request_field_values FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete access to change request field values"
  ON change_request_field_values FOR DELETE
  TO anon
  USING (true);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_risk_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER risk_field_values_updated_at
  BEFORE UPDATE ON risk_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_field_values_updated_at();

CREATE OR REPLACE FUNCTION update_issue_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issue_field_values_updated_at
  BEFORE UPDATE ON issue_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_issue_field_values_updated_at();

CREATE OR REPLACE FUNCTION update_change_request_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER change_request_field_values_updated_at
  BEFORE UPDATE ON change_request_field_values
  FOR EACH ROW
  EXECUTE FUNCTION update_change_request_field_values_updated_at();
