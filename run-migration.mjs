import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Attempting to apply migration by testing insert without task_name...');

    // Try to insert a test record without task_name
    const testProjectId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: testProjectId,
        task_data: { test: true }
      })
      .select();

    if (error) {
      console.log('Error inserting without task_name:', error.message);
      console.log('This confirms the NOT NULL constraint exists.');
      console.log('\nThe migration file has been created at:');
      console.log('supabase/migrations/20251029175500_make_task_name_nullable.sql');
      console.log('\nPlease apply it using your Supabase dashboard or CLI.');
    } else {
      console.log('Success! The constraint has been removed.');
      console.log('Cleaning up test record...');
      if (data && data[0]) {
        await supabase.from('project_tasks').delete().eq('id', data[0].id);
        console.log('Test record cleaned up.');
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigration();
