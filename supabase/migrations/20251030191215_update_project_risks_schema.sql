/*
  # Update project_risks table schema

  1. Changes to project_risks table
    - Add `assigned_to` (text) - Person assigned to manage the risk
    - Add `cost` (numeric) - Potential cost impact of the risk
    - Add `notes` (text) - Additional notes about the risk
    - Change `probability` from text to integer (0-100)
    - Drop unnecessary columns: risk_score, mitigation_strategy, identified_date, target_resolution_date, type

  2. Notes
    - Probability is now a percentage value from 0 to 100
    - Category options: Resource, Management, Technical, Vendor
    - Impact options: Low, Medium, High, Critical
    - Status options: Active, Closed
*/

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_risks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE project_risks ADD COLUMN assigned_to text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_risks' AND column_name = 'cost'
  ) THEN
    ALTER TABLE project_risks ADD COLUMN cost numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_risks' AND column_name = 'notes'
  ) THEN
    ALTER TABLE project_risks ADD COLUMN notes text;
  END IF;
END $$;

-- Change probability from text to integer
DO $$
BEGIN
  -- First, add a temporary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_risks' AND column_name = 'probability_int'
  ) THEN
    ALTER TABLE project_risks ADD COLUMN probability_int integer;
    
    -- Update values if probability column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'project_risks' AND column_name = 'probability'
    ) THEN
      -- Set default value of 50 for existing rows
      UPDATE project_risks SET probability_int = 50 WHERE probability_int IS NULL;
    END IF;
    
    -- Drop old column and rename new one
    ALTER TABLE project_risks DROP COLUMN IF EXISTS probability;
    ALTER TABLE project_risks RENAME COLUMN probability_int TO probability;
  END IF;
END $$;

-- Drop unnecessary columns if they exist
ALTER TABLE project_risks DROP COLUMN IF EXISTS risk_score;
ALTER TABLE project_risks DROP COLUMN IF EXISTS mitigation_strategy;
ALTER TABLE project_risks DROP COLUMN IF EXISTS identified_date;
ALTER TABLE project_risks DROP COLUMN IF EXISTS target_resolution_date;
ALTER TABLE project_risks DROP COLUMN IF EXISTS type;