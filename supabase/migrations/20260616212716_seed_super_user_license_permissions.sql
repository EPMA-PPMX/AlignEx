INSERT INTO license_tier_permissions (license_tier, permission_key, permission_name, description, can_execute)
SELECT 'Super User license', permission_key, permission_name, description, true
FROM license_tier_permissions
WHERE license_tier = 'Full license'
ON CONFLICT (license_tier, permission_key) DO UPDATE SET can_execute = true;
