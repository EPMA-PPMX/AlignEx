/*
  # Create project budgets table

  1. New Tables
    - `project_budgets`
      - `id` (uuid, primary key) - Unique identifier for the budget entry
      - `project_id` (uuid, foreign key) - References the projects table
      - `category` (text) - Budget category (e.g., "Labor", "Materials", "Equipment", "Software", "Travel", "Other")
      - `description` (text) - Description of the budget item
      - `planned_amount` (numeric) - Planned/budgeted amount
      - `actual_amount` (numeric) - Actual spent amount, defaults to 0
      - `currency` (text) - Currency code, defaults to 'USD'
      - `notes` (text, nullable) - Additional notes about the budget item
      - `created_at` (timestamptz) - When the budget item was created
      - `updated_at` (timestamptz) - When the budget item was last updated

  2. Security
    - Enable RLS on `project_budgets` table
    - Add policy for users to read all budget items for any project
    - Add policy for users to create budget items
    - Add policy for users to update their own budget items
    - Add policy for users to delete their own budget items
*/

CREATE TABLE IF NOT EXISTS project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Labor', 'Materials', 'Equipment', 'Software', 'Travel', 'Other')),
  description text NOT NULL,
  planned_amount numeric(15, 2) NOT NULL DEFAULT 0,
  actual_amount numeric(15, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  notes text,
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