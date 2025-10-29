const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20251029175500_make_task_name_nullable.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: make_task_name_nullable');
    console.log('SQL:', sql);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Error applying migration:', error);
      process.exit(1);
    }

    console.log('Migration applied successfully!');
    console.log('Result:', data);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigration();
