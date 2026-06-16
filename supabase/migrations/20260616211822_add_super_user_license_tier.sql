-- Add 'Super User license' to the valid license_tier check constraints
ALTER TABLE user_licenses
  DROP CONSTRAINT IF EXISTS user_licenses_license_tier_check;

ALTER TABLE user_licenses
  ADD CONSTRAINT user_licenses_license_tier_check
    CHECK (license_tier IN ('Read Only', 'Team Member', 'Full license', 'Super User license'));

ALTER TABLE license_tier_permissions
  DROP CONSTRAINT IF EXISTS license_tier_permissions_license_tier_check;

ALTER TABLE license_tier_permissions
  ADD CONSTRAINT license_tier_permissions_license_tier_check
    CHECK (license_tier IN ('Read Only', 'Team Member', 'Full license', 'Super User license'));
