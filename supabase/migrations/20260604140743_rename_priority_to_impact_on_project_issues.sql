/*
  # Rename priority to impact on project_issues

  1. Changes
    - Add `impact` column to `project_issues` (text, default 'Medium')
    - Copy all existing `priority` values into `impact`
    - The `priority` column is retained to avoid breaking anything else, but impact
      is now the canonical field shown and edited in the Issues dashboard.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'project_issues'
    AND column_name = 'impact'
  ) THEN
    ALTER TABLE project_issues ADD COLUMN impact text DEFAULT 'Medium';
  END IF;
END $$;

-- Back-fill impact from priority for all existing rows where impact is null
UPDATE project_issues
SET impact = priority
WHERE impact IS NULL AND priority IS NOT NULL;
