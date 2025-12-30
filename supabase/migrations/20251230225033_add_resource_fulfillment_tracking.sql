/*
  # Add Resource Fulfillment Tracking

  1. Changes to Existing Tables
    - Add `allocated_hours` column to `task_resource_assignments` table
      - Stores the allocation percentage (100% = 1 resource, 200% = 2 resources)
    
  2. New Tables
    - `resource_fulfillment_history`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references project_tasks)
      - `generic_resource_id` (uuid, references resources)
      - `generic_resource_name` (text)
      - `named_resource_id` (uuid, references resources)
      - `named_resource_name` (text)
      - `allocated_hours` (numeric)
      - `fulfilled_by` (text) - User who fulfilled the request
      - `fulfilled_at` (timestamptz)
      - `notes` (text)

  3. Security
    - Enable RLS on resource_fulfillment_history table
    - Add anonymous policies for full access (to be restricted later)

  4. Indexes
    - Index on task_id for history lookup
    - Index on generic_resource_id for tracking replacements
    - Index on fulfilled_at for reporting
*/

-- Add allocated_hours to task_resource_assignments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_resource_assignments' 
    AND column_name = 'allocated_hours'
  ) THEN
    ALTER TABLE task_resource_assignments 
    ADD COLUMN allocated_hours numeric(10, 2) DEFAULT 100.00;
  END IF;
END $$;

-- Create resource_fulfillment_history table
CREATE TABLE IF NOT EXISTS resource_fulfillment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  generic_resource_id uuid REFERENCES resources(id) ON DELETE SET NULL,
  generic_resource_name text NOT NULL,
  named_resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  named_resource_name text NOT NULL,
  allocated_hours numeric(10, 2) NOT NULL DEFAULT 100.00,
  fulfilled_by text,
  fulfilled_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resource_fulfillment_history_task_id 
  ON resource_fulfillment_history(task_id);

CREATE INDEX IF NOT EXISTS idx_resource_fulfillment_history_generic_resource_id 
  ON resource_fulfillment_history(generic_resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_fulfillment_history_fulfilled_at 
  ON resource_fulfillment_history(fulfilled_at);

-- Enable RLS
ALTER TABLE resource_fulfillment_history ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access (to be restricted later)
CREATE POLICY "Allow anonymous read access to resource_fulfillment_history"
  ON resource_fulfillment_history
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous insert to resource_fulfillment_history"
  ON resource_fulfillment_history
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update to resource_fulfillment_history"
  ON resource_fulfillment_history
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous delete from resource_fulfillment_history"
  ON resource_fulfillment_history
  FOR DELETE
  TO anon
  USING (true);

-- Add comments
COMMENT ON TABLE resource_fulfillment_history IS 'Tracks when generic resources are replaced with named resources';
COMMENT ON COLUMN resource_fulfillment_history.allocated_hours IS 'Allocation percentage: 100 = 1 FTE, 200 = 2 FTE';
COMMENT ON COLUMN task_resource_assignments.allocated_hours IS 'Allocation percentage: 100 = 1 FTE, 200 = 2 FTE';