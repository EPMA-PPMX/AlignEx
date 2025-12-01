/*
  # Add State and Status Fields to Projects Table

  1. Changes to `projects` table
    - Add `state` column with values: Active, On Hold, Cancelled, Closed
    - Add `health_status` column with values: On Track, At Risk, Delayed, Completed
    - Keep existing `status` column for backward compatibility (will be migrated to `state`)
    - Set default values for new columns

  2. Data Migration
    - Migrate existing `status` values to appropriate `state` and `health_status` values
    - Set sensible defaults for unmapped values

  3. Notes
    - `state` represents the project lifecycle state (Active, On Hold, etc.)
    - `health_status` represents the project health (On Track, At Risk, etc.)
    - Existing `status` field will be deprecated but kept for now
*/

-- Add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'state'
  ) THEN
    ALTER TABLE projects ADD COLUMN state text DEFAULT 'Active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE projects ADD COLUMN health_status text DEFAULT 'On Track';
  END IF;
END $$;

-- Migrate existing status values to state and health_status
UPDATE projects
SET 
  state = CASE
    WHEN status IN ('Cancelled') THEN 'Cancelled'
    WHEN status IN ('Completed', 'Closed') THEN 'Closed'
    WHEN status IN ('On-Hold', 'On Hold') THEN 'On Hold'
    ELSE 'Active'
  END,
  health_status = CASE
    WHEN status IN ('Completed') THEN 'Completed'
    WHEN status IN ('At Risk') THEN 'At Risk'
    WHEN status IN ('Delayed') THEN 'Delayed'
    ELSE 'On Track'
  END
WHERE state IS NULL OR health_status IS NULL;

-- Add check constraints for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_state_check'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_state_check
    CHECK (state IN ('Active', 'On Hold', 'Cancelled', 'Closed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_health_status_check'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_health_status_check
    CHECK (health_status IN ('On Track', 'At Risk', 'Delayed', 'Completed'));
  END IF;
END $$;
