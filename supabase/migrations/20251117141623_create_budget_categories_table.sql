/*
  # Create Budget Categories Table

  1. New Tables
    - `budget_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, required) - Category name
      - `description` (text, optional) - Category description
      - `is_active` (boolean, default true) - Whether category is active
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `budget_categories` table
    - Add policies for anonymous users to read budget categories
    - Add policies for anonymous users to create, update, and delete budget categories
*/

CREATE TABLE IF NOT EXISTS budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read budget categories
CREATE POLICY "Allow anonymous read access to budget categories"
  ON budget_categories
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert budget categories
CREATE POLICY "Allow anonymous insert access to budget categories"
  ON budget_categories
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update budget categories
CREATE POLICY "Allow anonymous update access to budget categories"
  ON budget_categories
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete budget categories
CREATE POLICY "Allow anonymous delete access to budget categories"
  ON budget_categories
  FOR DELETE
  TO anon
  USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_budget_categories_name ON budget_categories(name);
CREATE INDEX IF NOT EXISTS idx_budget_categories_active ON budget_categories(is_active);
