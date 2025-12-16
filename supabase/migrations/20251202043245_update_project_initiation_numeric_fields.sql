/*
  # Update Project Initiation Requests - Numeric Fields

  1. Changes
    - Change `estimated_duration` from text to integer (stores months)
    - Change `initial_estimated_cost` from text to numeric (stores dollar amount)
  
  2. Data Migration
    - Convert existing text durations (e.g., "3 months") to numeric values
    - Convert existing text costs (e.g., "$215,454") to numeric values
  
  3. Notes
    - Uses conditional logic to handle existing data safely
    - Preserves existing data where possible
*/

-- Add new numeric columns
ALTER TABLE project_initiation_requests
ADD COLUMN IF NOT EXISTS estimated_duration_months integer;

ALTER TABLE project_initiation_requests
ADD COLUMN IF NOT EXISTS estimated_cost numeric(15,2);

-- Migrate existing data from text fields to numeric fields
UPDATE project_initiation_requests
SET estimated_duration_months = CASE
  WHEN estimated_duration IS NULL THEN NULL
  WHEN estimated_duration LIKE '%month%' THEN 
    CAST(regexp_replace(estimated_duration, '[^0-9]', '', 'g') AS integer)
  ELSE NULL
END
WHERE estimated_duration_months IS NULL;

UPDATE project_initiation_requests
SET estimated_cost = CASE
  WHEN initial_estimated_cost IS NULL THEN NULL
  WHEN initial_estimated_cost ~ '[0-9]' THEN 
    CAST(regexp_replace(regexp_replace(initial_estimated_cost, '[$,]', '', 'g'), '[^0-9.]', '', 'g') AS numeric)
  ELSE NULL
END
WHERE estimated_cost IS NULL;

-- Drop old text columns
ALTER TABLE project_initiation_requests
DROP COLUMN IF EXISTS estimated_duration;

ALTER TABLE project_initiation_requests
DROP COLUMN IF EXISTS initial_estimated_cost;

-- Rename new columns to original names
ALTER TABLE project_initiation_requests
RENAME COLUMN estimated_duration_months TO estimated_duration;

ALTER TABLE project_initiation_requests
RENAME COLUMN estimated_cost TO initial_estimated_cost;