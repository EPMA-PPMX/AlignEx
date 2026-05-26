/*
  # Add tenant_name column to projects table

  Adds an optional tenant_name field to the projects table so that
  projects can be scoped to a specific tenant/organization.
  Users will only see projects that match their own tenant_name.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN tenant_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_tenant_name ON public.projects (tenant_name);
