ALTER TABLE menuitems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_menuitems" ON menuitems
  FOR SELECT TO anon, authenticated USING (true);
