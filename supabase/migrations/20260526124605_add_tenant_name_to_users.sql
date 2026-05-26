/*
  # Add tenant_name column to users table

  Adds an optional tenant_name field to the public.users table
  to identify which tenant/organization a user belongs to.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN tenant_name text;
  END IF;
END $$;
