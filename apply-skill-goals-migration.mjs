import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Testing skill_goals tables...\n');

    // Test if tables exist by trying to query them
    console.log('Testing skill_goals table...');
    const { data: goalsData, error: goalsError } = await supabase
      .from('skill_goals')
      .select('*')
      .limit(1);

    if (goalsError) {
      console.error('❌ skill_goals table does not exist yet');
      console.error('Error:', goalsError.message);
      console.log('\n📝 Please apply the migration manually:');
      console.log('File: supabase/migrations/20251114000001_create_skill_goals_tables.sql');
      return;
    }

    console.log('✅ skill_goals table exists');

    console.log('\nTesting skill_goal_tasks table...');
    const { data: tasksData, error: tasksError } = await supabase
      .from('skill_goal_tasks')
      .select('*')
      .limit(1);

    if (tasksError) {
      console.error('❌ skill_goal_tasks table does not exist yet');
      console.error('Error:', tasksError.message);
      return;
    }

    console.log('✅ skill_goal_tasks table exists');
    console.log('\n✅ All tables are ready!\n');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigration();
