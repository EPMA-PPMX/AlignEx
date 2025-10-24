/*
  # Create custom fields table

  1. New Tables
    - `custom_fields`
      - `id` (uuid, primary key)
      - `field_name` (text, required)
      - `field_type` (text, required)
      - `field_label` (text, required)
      - `is_required` (boolean, default false)
      - `default_value` (text, optional)
      - `options` (jsonb, for dropdown/radio options)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `custom_fields` table
    - Add policy for authenticated users to manage custom fields
*/

CREATE TABLE IF NOT EXISTS custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'email', 'date', 'dropdown', 'radio', 'checkbox', 'textarea')),
  field_label text NOT NULL,
  is_required boolean DEFAULT false,
  default_value text,
  options jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage custom fields"
  ON custom_fields
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_field_name ON custom_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_custom_fields_field_type ON custom_fields(field_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();