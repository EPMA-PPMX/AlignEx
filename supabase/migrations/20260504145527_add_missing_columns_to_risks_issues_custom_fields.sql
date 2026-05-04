/*
  # Add missing columns to project_risks, project_issues, and custom_fields

  ## Summary
  Several tables are missing columns that the application is actively trying to read/write,
  causing "column does not exist" errors when saving risks, issues, and ordering custom fields.

  ## Changes

  ### project_risks
  - Add `owner` (text) - person responsible for the risk
  - Add `assigned_to` (text) - person assigned to mitigate
  - Add `category` (text) - risk category (Resource, Schedule, etc.)
  - Add `probability` (integer) - likelihood percentage 0-100
  - Add `cost` (numeric) - estimated cost impact
  - Add `notes` (text) - additional notes

  ### project_issues
  - Add `owner` (text) - person responsible for the issue
  - Add `assigned_to` (text) - person assigned to resolve
  - Add `category` (text) - issue category
  - Add `priority` (text) - priority level (Low/Medium/High)
  - Add `resolution` (text) - resolution details

  ### custom_fields
  - Add `entity_type` (text) - which entity this field belongs to (project, risk, issue, etc.)
  - Add `display_order` (integer) - ordering of fields in the UI
  - Add `section` (text) - grouping section within a form
  - Add `description` (text) - field description/help text
*/

-- project_risks: add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'owner') THEN
    ALTER TABLE project_risks ADD COLUMN owner text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'assigned_to') THEN
    ALTER TABLE project_risks ADD COLUMN assigned_to text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'category') THEN
    ALTER TABLE project_risks ADD COLUMN category text DEFAULT 'Resource';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'probability') THEN
    ALTER TABLE project_risks ADD COLUMN probability integer DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'cost') THEN
    ALTER TABLE project_risks ADD COLUMN cost numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_risks' AND column_name = 'notes') THEN
    ALTER TABLE project_risks ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- project_issues: add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_issues' AND column_name = 'owner') THEN
    ALTER TABLE project_issues ADD COLUMN owner text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_issues' AND column_name = 'assigned_to') THEN
    ALTER TABLE project_issues ADD COLUMN assigned_to text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_issues' AND column_name = 'category') THEN
    ALTER TABLE project_issues ADD COLUMN category text DEFAULT 'Resource';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_issues' AND column_name = 'priority') THEN
    ALTER TABLE project_issues ADD COLUMN priority text DEFAULT 'Medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_issues' AND column_name = 'resolution') THEN
    ALTER TABLE project_issues ADD COLUMN resolution text DEFAULT '';
  END IF;
END $$;

-- custom_fields: add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_fields' AND column_name = 'entity_type') THEN
    ALTER TABLE custom_fields ADD COLUMN entity_type text DEFAULT 'project';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_fields' AND column_name = 'display_order') THEN
    ALTER TABLE custom_fields ADD COLUMN display_order integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_fields' AND column_name = 'section') THEN
    ALTER TABLE custom_fields ADD COLUMN section text DEFAULT 'general';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_fields' AND column_name = 'description') THEN
    ALTER TABLE custom_fields ADD COLUMN description text DEFAULT '';
  END IF;
END $$;
