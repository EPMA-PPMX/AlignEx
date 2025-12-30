/*
  # Update Action Items CASCADE Delete

  1. Changes
    - Changes action_items foreign key from SET NULL to CASCADE
    - When a project is deleted, all associated action items are automatically removed
    - Note: Most other tables already have CASCADE delete configured
    
  2. Security
    - No changes to RLS policies
    - Maintains data integrity while allowing clean project deletion
*/

-- Update action_items to CASCADE delete instead of SET NULL
ALTER TABLE IF EXISTS action_items 
  DROP CONSTRAINT IF EXISTS action_items_project_id_fkey;

ALTER TABLE IF EXISTS action_items
  ADD CONSTRAINT action_items_project_id_fkey 
  FOREIGN KEY (project_id) 
  REFERENCES projects(id) 
  ON DELETE CASCADE;