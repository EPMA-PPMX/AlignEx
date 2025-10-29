const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    // First check current constraint
    const { data: checkData, error: checkError } = await supabase
      .from('project_tasks')
      .select('task_name')
      .limit(1);
    
    console.log('Current state check:', checkError ? checkError.message : 'OK');
    
    // Try to insert a record without task_name to test
    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: '00000000-0000-0000-0000-000000000000',
        task_data: { test: true }
      })
      .select();
    
    if (error) {
      console.log('Error (expected if constraint exists):', error.message);
      console.log('Need to apply migration...');
    } else {
      console.log('Success! Constraint is already removed.');
      // Clean up test record
      if (data && data[0]) {
        await supabase.from('project_tasks').delete().eq('id', data[0].id);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
