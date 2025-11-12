/*
  # Add Default User ID to Timesheet Entries

  1. Changes
    - Set default value for user_id column to 'anonymous'
    - This allows timesheet entries to be created without explicitly providing user_id

  2. Notes
    - In future, this should be updated to use actual authenticated user IDs
    - For now, using 'anonymous' as placeholder
*/

-- Set default value for user_id
ALTER TABLE timesheet_entries ALTER COLUMN user_id SET DEFAULT 'anonymous';