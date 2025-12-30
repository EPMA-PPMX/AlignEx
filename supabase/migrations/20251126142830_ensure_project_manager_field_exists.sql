/*
  # Ensure Project Manager Field Exists

  1. Purpose
    - Ensures the "Project Manager" custom field exists in the system
    - This is a hardcoded system field that determines project ownership
    - Used to filter projects in the "My Projects" widget on the Hub page
  
  2. Changes
    - Creates the Project Manager field if it doesn't exist
    - Sets it to people_picker type
    - Applies to project entities
    - Makes it a required field for tracking project ownership
*/

-- Insert the Project Manager field if it doesn't exist
INSERT INTO custom_fields (
  id,
  field_name,
  field_type,
  field_label,
  description,
  is_required,
  entity_type,
  track_history,
  created_at,
  updated_at
)
VALUES (
  '82434cf3-e1bd-4e3a-8907-62f24b341495',
  'Project Manager',
  'people_picker',
  'Select the Project Manager',
  'The Project Manager is responsible for overseeing this project. This determines which projects appear in your My Projects section.',
  true,
  'project',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  field_type = 'people_picker',
  field_label = 'Select the Project Manager',
  description = 'The Project Manager is responsible for overseeing this project. This determines which projects appear in your My Projects section.',
  is_required = true,
  entity_type = 'project',
  track_history = true,
  updated_at = now();
