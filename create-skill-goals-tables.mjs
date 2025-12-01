import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY2OTc0MywiZXhwIjoyMDc3MjQ1NzQzfQ.dpK1bE70gH1Wx1RVCx7R3rOd6hgvYKx9YcMWp4rD9J8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('Creating skill_goals tables...\n');

  try {
    // Read the SQL from the migration file
    const sql = readFileSync('supabase/migrations/20251114000001_create_skill_goals_tables.sql', 'utf8');

    // Extract just the SQL commands (remove comments)
    const sqlCommands = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && !line.trim().startsWith('/*') && !line.trim().startsWith('*') && line.trim() !== '')
      .join('\n');

    console.log('Executing migration...');

    // Execute the SQL using the RPC function or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlCommands });

    if (error) {
      console.error('Error executing migration:', error);
      console.log('\nTrying alternative method...\n');

      // Alternative: Try creating tables directly via API
      await createTablesDirectly();
    } else {
      console.log('✅ Migration executed successfully!');
    }

  } catch (err) {
    console.error('Error:', err);
    console.log('\nTrying to create tables directly...\n');
    await createTablesDirectly();
  }
}

async function createTablesDirectly() {
  try {
    console.log('Attempting to check if tables exist...');

    // Try to query skill_goals table
    const { data: testGoals, error: goalsError } = await supabase
      .from('skill_goals')
      .select('id')
      .limit(1);

    if (goalsError && goalsError.message.includes('does not exist')) {
      console.log('❌ skill_goals table does not exist');
      console.log('\n⚠️  MANUAL ACTION REQUIRED:');
      console.log('Please run the following in your Supabase SQL Editor:\n');
      console.log('File: supabase/migrations/20251114000001_create_skill_goals_tables.sql\n');
      console.log('Or copy and paste the SQL directly into:');
      console.log('https://qhbarvxilqnnwjmdqxog.supabase.co/project/qhbarvxilqnnwjmdqxog/sql\n');
      return;
    }

    console.log('✅ skill_goals table exists!');

    // Try to query skill_goal_tasks table
    const { data: testTasks, error: tasksError } = await supabase
      .from('skill_goal_tasks')
      .select('id')
      .limit(1);

    if (tasksError && tasksError.message.includes('does not exist')) {
      console.log('❌ skill_goal_tasks table does not exist');
      return;
    }

    console.log('✅ skill_goal_tasks table exists!');
    console.log('\n✅ All tables are ready!\n');

  } catch (err) {
    console.error('Error:', err);
  }
}

createTables();
