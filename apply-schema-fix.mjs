import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://qhbarvxilqnnwjmdqxog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applySQLFix() {
  try {
    console.log('Applying schema fix for project_tasks.task_name column...\n');

    // Since we can't execute raw SQL directly, let's try using Postgres functions
    // or work around the constraint by modifying the table structure via DDL

    // First, let's try to create a test project and test task
    console.log('Step 1: Testing current state...');

    // Create a test project first (if one doesn't exist)
    const { data: existingProjects, error: projectFetchError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    let testProjectId;
    if (existingProjects && existingProjects.length > 0) {
      testProjectId = existingProjects[0].id;
      console.log('Using existing project:', testProjectId);
    } else {
      const { data: newProject, error: projectCreateError } = await supabase
        .from('projects')
        .insert({ name: 'Test Project for Schema Fix', status: 'Planning' })
        .select()
        .single();

      if (projectCreateError) {
        console.error('Error creating test project:', projectCreateError.message);
        return;
      }
      testProjectId = newProject.id;
      console.log('Created test project:', testProjectId);
    }

    // Now try to insert a task without task_name
    console.log('\nStep 2: Testing task insert without task_name...');
    const { data: taskData, error: taskError } = await supabase
      .from('project_tasks')
      .insert({
        project_id: testProjectId,
        task_data: { test: true, data: [], links: [] }
      })
      .select();

    if (taskError) {
      console.error('\n❌ Error: Cannot insert task without task_name');
      console.error('Error message:', taskError.message);
      console.log('\n⚠️  The NOT NULL constraint still exists on task_name column.');
      console.log('\n📝 Manual Steps Required:');
      console.log('1. Go to your Supabase dashboard at: https://qhbarvxilqnnwjmdqxog.supabase.co');
      console.log('2. Navigate to: SQL Editor');
      console.log('3. Run this SQL command:');
      console.log('\n   ALTER TABLE project_tasks ALTER COLUMN task_name DROP NOT NULL;\n');
      console.log('4. Or apply the migration file at:');
      console.log('   supabase/migrations/20251029175500_make_task_name_nullable.sql\n');
      return;
    }

    console.log('\n✅ Success! The constraint has been removed.');
    console.log('Task created successfully:', taskData[0].id);

    // Clean up test task
    console.log('\nCleaning up test data...');
    await supabase.from('project_tasks').delete().eq('id', taskData[0].id);
    console.log('✅ Test task removed.\n');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applySQLFix();
