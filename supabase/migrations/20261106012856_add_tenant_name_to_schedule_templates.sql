/*
# Scope schedule templates to an organisation

1. Modified Tables
- `schedule_templates`: adds `tenant_name` (text, nullable) so each schedule template belongs to one organisation.

2. Data
- Existing schedule templates are assigned to the 'TCS' organisation, the organisation the app currently runs under.

3. Security
- No policy or grant changes. Existing anonymous policies on `schedule_templates` are unchanged.

4. Notes
- Application screens filter schedule templates by the current organisation's tenant_name.
*/

ALTER TABLE public.schedule_templates ADD COLUMN IF NOT EXISTS tenant_name text;

UPDATE public.schedule_templates SET tenant_name = 'TCS' WHERE tenant_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_schedule_templates_tenant_name
  ON public.schedule_templates (tenant_name);
