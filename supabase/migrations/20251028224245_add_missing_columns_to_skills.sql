/*
  # Add missing columns to skills table

  1. Changes
    - Add `is_core` column (boolean) - Whether this is a core skill
    - Add `is_certifiable` column (boolean) - Whether this skill has certifications
    - Add `is_in_demand` column (boolean) - Whether this skill is currently in demand
    - Update `category_id` to be NOT NULL with foreign key constraint
  
  2. Notes
    - Using default value of false for all boolean columns
    - Existing skills will have false values for new columns until updated
*/

DO $$
BEGIN
  -- Add is_core column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skills' AND column_name = 'is_core'
  ) THEN
    ALTER TABLE skills ADD COLUMN is_core boolean DEFAULT false;
  END IF;

  -- Add is_certifiable column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skills' AND column_name = 'is_certifiable'
  ) THEN
    ALTER TABLE skills ADD COLUMN is_certifiable boolean DEFAULT false;
  END IF;

  -- Add is_in_demand column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skills' AND column_name = 'is_in_demand'
  ) THEN
    ALTER TABLE skills ADD COLUMN is_in_demand boolean DEFAULT false;
  END IF;
END $$;

-- Update category_id to NOT NULL if there are no NULL values
DO $$
BEGIN
  -- Only update if there are no NULL category_id values
  IF NOT EXISTS (SELECT 1 FROM skills WHERE category_id IS NULL) THEN
    ALTER TABLE skills ALTER COLUMN category_id SET NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'skills_category_id_fkey'
    AND table_name = 'skills'
  ) THEN
    ALTER TABLE skills 
      ADD CONSTRAINT skills_category_id_fkey 
      FOREIGN KEY (category_id) 
      REFERENCES skill_categories(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint on category_id and name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'skills_category_id_name_key'
    AND table_name = 'skills'
  ) THEN
    ALTER TABLE skills 
      ADD CONSTRAINT skills_category_id_name_key 
      UNIQUE (category_id, name);
  END IF;
END $$;