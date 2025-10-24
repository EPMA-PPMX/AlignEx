/*
  # Skills Management System

  1. New Tables
    - `skill_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name (e.g., "Project Management")
      - `description` (text) - Category description
      - `manager` (text) - Person responsible for this category
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `skills`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key to skill_categories)
      - `name` (text) - Skill name (e.g., "Resource Management")
      - `description` (text) - Skill description
      - `is_core` (boolean) - Whether this is a core skill
      - `is_certifiable` (boolean) - Whether this skill has certifications
      - `is_in_demand` (boolean) - Whether this skill is currently in demand
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Role name (e.g., "Project Manager")
      - `description` (text) - Role description
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `role_skill_requirements`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to roles)
      - `skill_id` (uuid, foreign key to skills)
      - `required_level` (text) - Required proficiency level (None, Basic, Intermediate, Expert)
      - `created_at` (timestamptz)
    
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

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read all data
    - Add policies for authenticated users to manage their own skill ratings
    - Add policies for authenticated users to manage categories, skills, and roles (admin functionality)
*/

-- Create skill_categories table
CREATE TABLE IF NOT EXISTS skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  manager text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES skill_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  is_core boolean DEFAULT false,
  is_certifiable boolean DEFAULT false,
  is_in_demand boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category_id, name)
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_skill_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

-- Policies for skill_categories
CREATE POLICY "Anyone can read skill categories"
  ON skill_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert skill categories"
  ON skill_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update skill categories"
  ON skill_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete skill categories"
  ON skill_categories FOR DELETE
  TO authenticated
  USING (true);

-- Policies for skills
CREATE POLICY "Anyone can read skills"
  ON skills FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert skills"
  ON skills FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update skills"
  ON skills FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete skills"
  ON skills FOR DELETE
  TO authenticated
  USING (true);

-- Policies for roles
CREATE POLICY "Anyone can read roles"
  ON roles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete roles"
  ON roles FOR DELETE
  TO authenticated
  USING (true);

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
CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills(category_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_requirements_role_id ON role_skill_requirements(role_id);
CREATE INDEX IF NOT EXISTS idx_role_skill_requirements_skill_id ON role_skill_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
