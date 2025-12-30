/*
  # Create Demo User License
  
  This migration creates a demo user license for testing and development.
  The demo user will have full_license tier with access to all modules.
  
  1. Insert Demo User License
    - Creates license for demo@alignex.com
    - Assigns full_license tier for complete access
    - Links to default organization
    - Sets as active
  
  2. Notes
    - This is for development/testing purposes
    - In production, licenses should be assigned through admin interface
    - Demo user has access to all features for demonstration
*/

-- Insert demo user license
INSERT INTO user_licenses (
  user_email,
  organization_id,
  license_tier,
  is_active,
  assigned_date,
  notes
)
VALUES (
  'demo@alignex.com',
  '00000000-0000-0000-0000-000000000001',
  'full_license',
  true,
  CURRENT_DATE,
  'Demo user with full access for testing and development'
)
ON CONFLICT (user_email) 
DO UPDATE SET 
  license_tier = EXCLUDED.license_tier,
  is_active = EXCLUDED.is_active,
  updated_at = now();