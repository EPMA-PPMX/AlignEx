/*
  # Create budget forecast monthly table for annual 12-month tracking

  1. New Tables
    - `budget_forecast_monthly`
      - `id` (uuid, primary key) - Unique identifier for the budget forecast entry
      - `project_id` (uuid, foreign key) - References the projects table
      - `category` (text) - Budget category (from Cost Category custom field)
      - `year` (integer) - The year for this forecast (e.g., 2025)
      - `january_forecast` (numeric) - Forecasted amount for January
      - `january_actual` (numeric) - Actual spent amount for January
      - `february_forecast` (numeric) - Forecasted amount for February
      - `february_actual` (numeric) - Actual spent amount for February
      - `march_forecast` (numeric) - Forecasted amount for March
      - `march_actual` (numeric) - Actual spent amount for March
      - `april_forecast` (numeric) - Forecasted amount for April
      - `april_actual` (numeric) - Actual spent amount for April
      - `may_forecast` (numeric) - Forecasted amount for May
      - `may_actual` (numeric) - Actual spent amount for May
      - `june_forecast` (numeric) - Forecasted amount for June
      - `june_actual` (numeric) - Actual spent amount for June
      - `july_forecast` (numeric) - Forecasted amount for July
      - `july_actual` (numeric) - Actual spent amount for July
      - `august_forecast` (numeric) - Forecasted amount for August
      - `august_actual` (numeric) - Actual spent amount for August
      - `september_forecast` (numeric) - Forecasted amount for September
      - `september_actual` (numeric) - Actual spent amount for September
      - `october_forecast` (numeric) - Forecasted amount for October
      - `october_actual` (numeric) - Actual spent amount for October
      - `november_forecast` (numeric) - Forecasted amount for November
      - `november_actual` (numeric) - Actual spent amount for November
      - `december_forecast` (numeric) - Forecasted amount for December
      - `december_actual` (numeric) - Actual spent amount for December
      - `created_at` (timestamptz) - When the budget forecast was created
      - `updated_at` (timestamptz) - When the budget forecast was last updated

  2. Security
    - Enable RLS on `budget_forecast_monthly` table
    - Add policies for authenticated and anonymous users to manage budget forecasts

  3. Indexes
    - Create index on project_id for faster queries
    - Create unique index on (project_id, category, year) to prevent duplicates

  4. Notes
    - Each row represents a full 12-month forecast for one category for one year
    - All amounts default to 0
    - Supports decimal amounts with 2 decimal places precision
*/

CREATE TABLE IF NOT EXISTS budget_forecast_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category text NOT NULL,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  january_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  january_actual numeric(15, 2) NOT NULL DEFAULT 0,
  february_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  february_actual numeric(15, 2) NOT NULL DEFAULT 0,
  march_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  march_actual numeric(15, 2) NOT NULL DEFAULT 0,
  april_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  april_actual numeric(15, 2) NOT NULL DEFAULT 0,
  may_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  may_actual numeric(15, 2) NOT NULL DEFAULT 0,
  june_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  june_actual numeric(15, 2) NOT NULL DEFAULT 0,
  july_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  july_actual numeric(15, 2) NOT NULL DEFAULT 0,
  august_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  august_actual numeric(15, 2) NOT NULL DEFAULT 0,
  september_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  september_actual numeric(15, 2) NOT NULL DEFAULT 0,
  october_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  october_actual numeric(15, 2) NOT NULL DEFAULT 0,
  november_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  november_actual numeric(15, 2) NOT NULL DEFAULT 0,
  december_forecast numeric(15, 2) NOT NULL DEFAULT 0,
  december_actual numeric(15, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_forecast_project_id ON budget_forecast_monthly(project_id);

-- Create unique constraint to prevent duplicate category/year combinations
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_forecast_unique ON budget_forecast_monthly(project_id, category, year);

-- Enable RLS
ALTER TABLE budget_forecast_monthly ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view budget forecasts"
  ON budget_forecast_monthly
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create budget forecasts"
  ON budget_forecast_monthly
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget forecasts"
  ON budget_forecast_monthly
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete budget forecasts"
  ON budget_forecast_monthly
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for anonymous users
CREATE POLICY "Anonymous users can view budget forecasts"
  ON budget_forecast_monthly
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can create budget forecasts"
  ON budget_forecast_monthly
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update budget forecasts"
  ON budget_forecast_monthly
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anonymous users can delete budget forecasts"
  ON budget_forecast_monthly
  FOR DELETE
  TO anon
  USING (true);