-- Enable RLS and add anonymous read policy for typeoflicense
ALTER TABLE typeoflicense ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_typeoflicense" ON typeoflicense
  FOR SELECT TO anon, authenticated USING (true);

-- Enable RLS and add full anonymous policies for menu_management
ALTER TABLE menu_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_menu_management" ON menu_management
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anon_insert_menu_management" ON menu_management
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_update_menu_management" ON menu_management
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_menu_management" ON menu_management
  FOR DELETE TO anon, authenticated USING (true);
