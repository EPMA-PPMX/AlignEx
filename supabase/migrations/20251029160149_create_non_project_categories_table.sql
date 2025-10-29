/*
  # Create Non-Project Work Categories Table

  1. New Tables
    - `non_project_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (e.g., PTO, Training, Administrative)
      - `description` (text) - Category description
      - `is_active` (boolean) - Whether the category is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Add policies for anonymous access

  3. Default Data
    - Insert default categories: PTO, Training, Administrative, Meetings
*/

-- Create non_project_categories table
CREATE TABLE IF NOT EXISTS non_project_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE non_project_categories ENABLE ROW LEVEL SECURITY;

-- Policies for non_project_categories
CREATE POLICY "Anyone can view categories"
  ON non_project_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert categories"
  ON non_project_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON non_project_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete categories"
  ON non_project_categories FOR DELETE
  USING (true);

-- Add foreign key constraint to timesheet_entries if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'timesheet_entries_non_project_category_id_fkey'
  ) THEN
    ALTER TABLE timesheet_entries
      ADD CONSTRAINT timesheet_entries_non_project_category_id_fkey
      FOREIGN KEY (non_project_category_id)
      REFERENCES non_project_categories(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Insert default categories
INSERT INTO non_project_categories (name, description, is_active) VALUES
  ('PTO', 'Paid Time Off', true),
  ('Training', 'Training and professional development', true),
  ('Administrative', 'Administrative tasks', true),
  ('Meetings', 'General meetings and administrative meetings', true)
ON CONFLICT DO NOTHING;