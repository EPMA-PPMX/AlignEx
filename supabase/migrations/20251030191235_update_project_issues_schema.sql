/*
  # Update project_issues table schema

  1. Changes to project_issues table
    - Rename `resolution_notes` to `resolution`
    - Drop unnecessary columns: severity, identified_date, target_resolution_date, resolution_date, impact, type

  2. Notes
    - Status options: Active, Closed
    - Category options: Resource, Management, Technical, Vendor
    - Priority options: Low, Medium, High, Critical
*/

-- Rename resolution_notes to resolution
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_issues' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE project_issues RENAME COLUMN resolution_notes TO resolution;
  END IF;
END $$;

-- Drop unnecessary columns if they exist
ALTER TABLE project_issues DROP COLUMN IF EXISTS severity;
ALTER TABLE project_issues DROP COLUMN IF EXISTS identified_date;
ALTER TABLE project_issues DROP COLUMN IF EXISTS target_resolution_date;
ALTER TABLE project_issues DROP COLUMN IF EXISTS resolution_date;
ALTER TABLE project_issues DROP COLUMN IF EXISTS impact;
ALTER TABLE project_issues DROP COLUMN IF EXISTS type;