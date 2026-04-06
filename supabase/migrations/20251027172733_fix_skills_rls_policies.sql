/*
  # Fix Skills Management RLS Policies for Anonymous Access

  1. Changes
    - Drop existing restrictive policies on all skills tables
    - Add new policies that allow anonymous (public) access
    - This allows the application to work without authentication
  
  2. Security Notes
    - These policies allow full public access to skills management
    - In production with authentication, these should be restricted to authenticated users only
*/

-- Drop existing policies for skill_categories
DROP POLICY IF EXISTS "Anyone can read skill categories" ON skill_categories;
DROP POLICY IF EXISTS "Authenticated users can insert skill categories" ON skill_categories;
DROP POLICY IF EXISTS "Authenticated users can update skill categories" ON skill_categories;
DROP POLICY IF EXISTS "Authenticated users can delete skill categories" ON skill_categories;

-- Drop existing policies for skills
DROP POLICY IF EXISTS "Anyone can read skills" ON skills;
DROP POLICY IF EXISTS "Authenticated users can insert skills" ON skills;
DROP POLICY IF EXISTS "Authenticated users can update skills" ON skills;
DROP POLICY IF EXISTS "Authenticated users can delete skills" ON skills;

-- Drop existing policies for roles
DROP POLICY IF EXISTS "Anyone can read roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can insert roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can update roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can delete roles" ON roles;

-- Drop existing policies for role_skill_requirements
DROP POLICY IF EXISTS "Anyone can read role skill requirements" ON role_skill_requirements;
DROP POLICY IF EXISTS "Authenticated users can insert role skill requirements" ON role_skill_requirements;
DROP POLICY IF EXISTS "Authenticated users can update role skill requirements" ON role_skill_requirements;
DROP POLICY IF EXISTS "Authenticated users can delete role skill requirements" ON role_skill_requirements;

-- Drop existing policies for user_skills
DROP POLICY IF EXISTS "Anyone can read user skills" ON user_skills;
DROP POLICY IF EXISTS "Authenticated users can insert their own skill ratings" ON user_skills;
DROP POLICY IF EXISTS "Authenticated users can update their own skill ratings" ON user_skills;
DROP POLICY IF EXISTS "Authenticated users can delete their own skill ratings" ON user_skills;

-- Create new anonymous-friendly policies for skill_categories
CREATE POLICY "Anyone can view skill categories"
  ON skill_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert skill categories"
  ON skill_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update skill categories"
  ON skill_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete skill categories"
  ON skill_categories FOR DELETE
  USING (true);

-- Create new anonymous-friendly policies for skills
CREATE POLICY "Anyone can view skills"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert skills"
  ON skills FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update skills"
  ON skills FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete skills"
  ON skills FOR DELETE
  USING (true);

-- Create new anonymous-friendly policies for roles
CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert roles"
  ON roles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update roles"
  ON roles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete roles"
  ON roles FOR DELETE
  USING (true);

-- Create new anonymous-friendly policies for role_skill_requirements
CREATE POLICY "Anyone can view role skill requirements"
  ON role_skill_requirements FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert role skill requirements"
  ON role_skill_requirements FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update role skill requirements"
  ON role_skill_requirements FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete role skill requirements"
  ON role_skill_requirements FOR DELETE
  USING (true);

-- Create new anonymous-friendly policies for user_skills
CREATE POLICY "Anyone can view user skills"
  ON user_skills FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert user skills"
  ON user_skills FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update user skills"
  ON user_skills FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete user skills"
  ON user_skills FOR DELETE
  USING (true);
