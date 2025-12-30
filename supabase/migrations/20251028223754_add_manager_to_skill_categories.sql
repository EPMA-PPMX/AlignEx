/*
  # Add manager column to skill_categories table

  1. Changes
    - Add `manager` column to `skill_categories` table
      - Type: text (nullable)
      - Stores the name of the person managing this skill category
  
  2. Notes
    - Using nullable text type to allow categories without assigned managers
    - Existing categories will have NULL manager values until updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_categories' AND column_name = 'manager'
  ) THEN
    ALTER TABLE skill_categories ADD COLUMN manager text;
  END IF;
END $$;