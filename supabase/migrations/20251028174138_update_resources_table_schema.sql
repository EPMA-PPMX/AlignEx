/*
  # Update Resources Table Schema
  
  This migration updates the existing resources table to match the intended schema
  with support for both person and generic resources.
  
  1. Changes
    - Add resource_type column (person or generic)
    - Rename name to first_name for existing data
    - Add last_name column
    - Add resource_name column for generic resources
    - Add display_name as generated column
    - Change role (text) to roles (text array)
    - Add cost_rate and rate_type columns
    - Rename availability_status to status
    - Add AD sync fields (ad_synced, ad_user_id, last_synced_at)
    - Add custom_attributes jsonb column
    
  2. Data Migration
    - Existing records are treated as 'person' type
    - Existing name is split into first_name and last_name
    - Existing role is converted to roles array
    - availability_status is mapped to status
*/

-- Add resource_type column (default to 'person' for existing records)
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS resource_type text NOT NULL DEFAULT 'person' 
CHECK (resource_type IN ('person', 'generic'));

-- Add columns for person resources
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Migrate existing name data to first_name and last_name
UPDATE resources 
SET 
  first_name = CASE 
    WHEN position(' ' in name) > 0 THEN split_part(name, ' ', 1)
    ELSE name
  END,
  last_name = CASE 
    WHEN position(' ' in name) > 0 THEN substring(name from position(' ' in name) + 1)
    ELSE ''
  END
WHERE first_name IS NULL;

-- Drop old name column
ALTER TABLE resources DROP COLUMN IF EXISTS name;

-- Add resource_name column for generic resources
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS resource_name text;

-- Add display_name as generated column
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS display_name text GENERATED ALWAYS AS (
  CASE 
    WHEN resource_type = 'person' THEN COALESCE(first_name || ' ' || last_name, email)
    ELSE resource_name
  END
) STORED;

-- Add roles array column
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS roles text[] DEFAULT '{}';

-- Migrate existing role data to roles array
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resources' AND column_name = 'role'
  ) THEN
    UPDATE resources 
    SET roles = CASE 
      WHEN role IS NOT NULL AND role != '' THEN ARRAY[role]
      ELSE '{}'
    END
    WHERE roles = '{}';
    
    ALTER TABLE resources DROP COLUMN role;
  END IF;
END $$;

-- Add cost and rate columns
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS cost_rate numeric(10, 2),
ADD COLUMN IF NOT EXISTS rate_type text CHECK (rate_type IN ('hourly', 'daily', 'monthly'));

-- Rename availability_status to status if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resources' AND column_name = 'availability_status'
  ) THEN
    ALTER TABLE resources RENAME COLUMN availability_status TO status_old;
    ALTER TABLE resources 
    ADD COLUMN status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
    
    -- Map old values to new values
    UPDATE resources 
    SET status = CASE 
      WHEN status_old = 'Available' THEN 'active'
      WHEN status_old = 'Unavailable' THEN 'inactive'
      ELSE 'active'
    END;
    
    ALTER TABLE resources DROP COLUMN status_old;
  ELSE
    ALTER TABLE resources 
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Add AD sync columns
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS ad_synced boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ad_user_id text,
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Add custom_attributes column
ALTER TABLE resources 
ADD COLUMN IF NOT EXISTS custom_attributes jsonb DEFAULT '{}';

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'person_requires_name' AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE resources 
    ADD CONSTRAINT person_requires_name CHECK (
      resource_type != 'person' OR (first_name IS NOT NULL AND last_name IS NOT NULL)
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'generic_requires_name' AND conrelid = 'resources'::regclass
  ) THEN
    ALTER TABLE resources 
    ADD CONSTRAINT generic_requires_name CHECK (
      resource_type != 'generic' OR resource_name IS NOT NULL
    );
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_resources_email ON resources(email);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_ad_user_id ON resources(ad_user_id);

-- Update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS resources_updated_at ON resources;
CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();