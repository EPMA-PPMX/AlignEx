/*
# Link user accounts to resource profiles by email

1. Behavior
- Whenever a resource is created, or its email or tenant is changed, any user with the same email (case-insensitive) in the same tenant gets that resource set as their `resource_id`.
- Users already linked to a resource are left unchanged.
- One-time backfill links existing users that match a resource today.

2. Security
- The trigger function runs as its owner so it can update `users` regardless of the caller.
- Execute is revoked from public API roles; only the trigger uses it.
- No table grants or policies change.

3. Notes
- Only unlinked users are updated, so an existing link is never overwritten.
*/

CREATE OR REPLACE FUNCTION link_user_to_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE users
    SET resource_id = NEW.id
    WHERE lower(email) = lower(NEW.email)
      AND tenant_name IS NOT DISTINCT FROM NEW.tenant_name
      AND resource_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION link_user_to_resource() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS link_user_to_resource_trg ON resources;
CREATE TRIGGER link_user_to_resource_trg
AFTER INSERT OR UPDATE OF email, tenant_name ON resources
FOR EACH ROW
EXECUTE FUNCTION link_user_to_resource();

UPDATE users u
SET resource_id = r.id
FROM resources r
WHERE r.email IS NOT NULL
  AND lower(u.email) = lower(r.email)
  AND u.tenant_name IS NOT DISTINCT FROM r.tenant_name
  AND u.resource_id IS NULL;
