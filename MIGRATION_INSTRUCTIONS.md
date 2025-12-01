# Manual Migration Instructions for Skill Goals Tables

The skill_goals tables need to be created manually in your Supabase database.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://qhbarvxilqnnwjmdqxog.supabase.co
2. Navigate to: **SQL Editor** (in the left sidebar)
3. Click "New Query"
4. Copy and paste the ENTIRE contents of this file:
   `supabase/migrations/20251114000001_create_skill_goals_tables.sql`
5. Click "Run" or press Ctrl+Enter
6. You should see "Success. No rows returned"

## Option 2: Via Supabase CLI (If installed)

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or apply a specific migration:

```bash
supabase migration up --local
```

## Verification

After running the migration, refresh your browser and try adding a goal again. The error should be gone.

To verify the tables were created, run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('skill_goals', 'skill_goal_tasks');
```

You should see both tables listed.

## What These Tables Do

- **skill_goals**: Stores individual development goals (certifications, training, etc.)
- **skill_goal_tasks**: Stores actionable tasks for each goal with completion tracking

Both tables have RLS (Row Level Security) enabled with anonymous access policies for now.
