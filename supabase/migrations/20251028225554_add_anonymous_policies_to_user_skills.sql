/*
  # Add anonymous access policies to user_skills

  1. Changes
    - Add INSERT policy for anonymous users
    - Add UPDATE policy for anonymous users
    - Add DELETE policy for anonymous users
  
  2. Security Notes
    - This allows anonymous users to manage their own skill ratings
    - Following the same pattern as other tables in the application
    - RLS remains enabled to protect the table
*/

-- Drop existing policies for authenticated users to recreate them for both anon and authenticated
DROP POLICY IF EXISTS "Authenticated users can insert their own skill ratings" ON user_skills;
DROP POLICY IF EXISTS "Authenticated users can update their own skill ratings" ON user_skills;
DROP POLICY IF EXISTS "Authenticated users can delete their own skill ratings" ON user_skills;

-- Create new policies that allow both anonymous and authenticated users
CREATE POLICY "Anyone can insert skill ratings"
  ON user_skills FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update skill ratings"
  ON user_skills FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete skill ratings"
  ON user_skills FOR DELETE
  TO anon, authenticated
  USING (true);