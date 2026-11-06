/*
# Scope project types (project_templates) to an organisation

1. Modified Tables
- `project_templates`: adds `tenant_name` (text, nullable) so each project type belongs to one organisation.

2. Data
- Existing project types are assigned to the 'TCS' organisation, which is the organisation the app currently runs under.

3. Security
- No policy or grant changes. Existing anonymous policies on `project_templates` are unchanged.

4. Notes
- Application screens filter project types by the current organisation's tenant_name.
*/

ALTER TABLE public.project_templates ADD COLUMN IF NOT EXISTS tenant_name text;

UPDATE public.project_templates SET tenant_name = 'TCS' WHERE tenant_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_templates_tenant_name
  ON public.project_templates (tenant_name);
