/*
  # Add tenant_name column to project_initiation_requests table

  Adds tenant_name to scope project initiation requests per tenant,
  so users only see requests belonging to their organization.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_initiation_requests'
      AND column_name = 'tenant_name'
  ) THEN
    ALTER TABLE public.project_initiation_requests ADD COLUMN tenant_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_project_initiation_requests_tenant_name
  ON public.project_initiation_requests (tenant_name);
