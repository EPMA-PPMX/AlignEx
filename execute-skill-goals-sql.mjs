import pg from 'pg';
const { Client } = pg;

// Parse Supabase connection string
const connectionString = 'postgresql://postgres.qhbarvxilqnnwjmdqxog:AlignEX2024!!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

const sql = `
-- Create skill_goals table
CREATE TABLE IF NOT EXISTS skill_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
  skill_id uuid REFERENCES skills(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  goal_type text NOT NULL DEFAULT 'other',
  target_date date,
  status text NOT NULL DEFAULT 'not_started',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create skill_goal_tasks table
CREATE TABLE IF NOT EXISTS skill_goal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES skill_goals(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  due_date date,
  notes text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE skill_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_goal_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for skill_goals
DROP POLICY IF EXISTS "Allow anonymous read access to skill_goals" ON skill_goals;
CREATE POLICY "Allow anonymous read access to skill_goals"
  ON skill_goals FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert access to skill_goals" ON skill_goals;
CREATE POLICY "Allow anonymous insert access to skill_goals"
  ON skill_goals FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update access to skill_goals" ON skill_goals;
CREATE POLICY "Allow anonymous update access to skill_goals"
  ON skill_goals FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete access to skill_goals" ON skill_goals;
CREATE POLICY "Allow anonymous delete access to skill_goals"
  ON skill_goals FOR DELETE
  TO anon
  USING (true);

-- Policies for skill_goal_tasks
DROP POLICY IF EXISTS "Allow anonymous read access to skill_goal_tasks" ON skill_goal_tasks;
CREATE POLICY "Allow anonymous read access to skill_goal_tasks"
  ON skill_goal_tasks FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert access to skill_goal_tasks" ON skill_goal_tasks;
CREATE POLICY "Allow anonymous insert access to skill_goal_tasks"
  ON skill_goal_tasks FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update access to skill_goal_tasks" ON skill_goal_tasks;
CREATE POLICY "Allow anonymous update access to skill_goal_tasks"
  ON skill_goal_tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete access to skill_goal_tasks" ON skill_goal_tasks;
CREATE POLICY "Allow anonymous delete access to skill_goal_tasks"
  ON skill_goal_tasks FOR DELETE
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skill_goals_user_id ON skill_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_goals_skill_id ON skill_goals(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_goals_status ON skill_goals(status);
CREATE INDEX IF NOT EXISTS idx_skill_goal_tasks_goal_id ON skill_goal_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_skill_goal_tasks_completed ON skill_goal_tasks(completed);
`;

async function executeSql() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    console.log('Executing SQL migration...');
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');

    console.log('Verifying tables...');
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('skill_goals', 'skill_goal_tasks')
      ORDER BY table_name;
    `);

    console.log('Tables created:');
    result.rows.forEach(row => console.log('  ✓', row.table_name));
    console.log('\n✅ All done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

executeSql();
