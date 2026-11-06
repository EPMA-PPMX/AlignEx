/*
# Scope custom fields to an organisation, with common fields

1. Modified Tables
- `custom_fields`: adds `tenant_name` (text, nullable).
  - NULL means the field is a common field, visible to every organisation.
  - A value means the field belongs to that organisation only.

2. Data
- Existing custom fields are left as NULL, so they become common fields across all organisations. No rows are changed.

3. Security
- No policy or grant changes.

4. Notes
- Application screens show common fields plus the current organisation's fields.
- Fields created from now on are tagged with the current organisation.
*/

ALTER TABLE public.custom_fields ADD COLUMN IF NOT EXISTS tenant_name text;

CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant_name
  ON public.custom_fields (tenant_name);
