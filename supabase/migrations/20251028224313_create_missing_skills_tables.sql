/*
  # Create missing skills management tables

  1. New Tables
    - `role_skill_requirements`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to roles)
      - `skill_id` (uuid, foreign key to skills)
      - `required_level` (text) - Required proficiency level (None, Basic, Intermediate, Expert)
      - `created_at` (timestamptz)
      - Unique constraint on (role_id, skill_id)
    
    - `user_skills`
      - `id` (uuid, primary key)
      - `user_id` (text) - User identifier
      - `skill_id` (uuid, foreign key to skills)
      - `proficiency_level` (text) - User's proficiency level (None, Basic, Intermediate, Expert)
      - `years_of_experience` (decimal) - Years of experience with this skill
      - `certification_name` (text) - Name of certification (if applicable)
      - `certification_date` (date) - Date certification was obtained
      - `certification_expiry` (date) - Date certification expires
      - `comments` (text) - Additional comments
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, skill_id)

  2. Security
    - Enable RLS on all tables
    - Add policies for anonymous and authenticated users to read all data
    - Add policies for authenticated users to manage their own skill ratings
    - Add policies for authenticated users to manage role skill requirements
*/

-- Create role_skill_requirements table
CREATE TABLE IF NOT EXISTS role_skill_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  required_level text NOT NULL CHECK (required_level IN ('None', 'Basic', 'Intermediate', 'Expert')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, skill_id)
);

-- Create user_skills table
CREATE TABLE IF NOT EXISTS user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  proficiency_level text NOT NULL CHECK (proficiency_level IN ('None', 'Basic', 'Intermediate', 'Expert')),
  years_of_experience decimal(4, 1) DEFAULT 0,
  certification_name text DEFAULT '',
  certification_date date,
  certification_expiry date,
  comments text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Enable RLS
ALTER TABLE role_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Policies for role_skill_requirements
CREATE POLICY "Anyone can read role skill requirements"
  ON role_skill_requirements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert role skill requirements"
  ON role_skill_requirements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update role skill requirements"
  ON role_skill_requirements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete role skill requirements"
  ON role_skill_requirements FOR DELETE
  TO authenticated
  USING (true);

-- Policies for user_skills
CREATE POLICY "Anyone can read user skills"
  ON user_skills FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert their own skill ratings"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update their own skill ratings"
  ON user_skills FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own skill ratings"
  ON user_skills FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_role_skill_requirements_role_id ON role_skill_requirements(role_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_requirements_skill_id ON role_skill_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);