/*
  # Update project budgets table to support multiple categories

  1. Changes
    - Drop old columns: category, description, planned_amount, actual_amount, currency, notes
    - Add new column: categories (text array) - Stores multiple selected categories from Cost Category custom field
    - Keep id, project_id, created_at, updated_at columns

  2. Notes
    - This is a breaking change that restructures the budget table
    - Existing budget data will be lost (if any)
    - The new structure stores only selected categories as an array
*/

-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS project_budgets CASCADE;

CREATE TABLE project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all project budgets"
  ON project_budgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create project budgets"
  ON project_budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update project budgets"
  ON project_budgets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete project budgets"
  ON project_budgets
  FOR DELETE
  TO authenticated
  USING (true);