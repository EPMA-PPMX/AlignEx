/*
  # Update project budgets category constraint

  1. Changes
    - Remove the CHECK constraint on the category column in project_budgets table
    - This allows categories to be dynamically loaded from the Cost Category custom field
    - Previously limited to: 'Labor', 'Materials', 'Equipment', 'Software', 'Travel', 'Other'
    - Now accepts any text value to support custom categories

  2. Notes
    - This change maintains backward compatibility with existing data
    - All existing categories will continue to work
    - New budget items can now use custom categories defined in project templates
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_budgets_category_check'
  ) THEN
    ALTER TABLE project_budgets DROP CONSTRAINT project_budgets_category_check;
  END IF;
END $$;