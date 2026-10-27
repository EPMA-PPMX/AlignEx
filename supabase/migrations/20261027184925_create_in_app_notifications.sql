/*
# Create in-app notifications and notification preference support

## Purpose
Adds the durable notification inbox used by My Hub. Notifications are stored so users can
see unread counts and open details after a page refresh.

## New Tables
- `app_notifications`
  - `id` (uuid primary key)
  - `user_id` (text) — application user identifier
  - `tenant_name` (text) — tenant boundary
  - `notification_type` (text) — `project_update`, `deadline`, or `system`
  - `title` (text) — short notification heading
  - `message` (text) — notification detail
  - `related_id` (text, nullable) — linked project or record identifier
  - `related_type` (text, nullable) — linked record type
  - `dedupe_key` (text, unique) — prevents repeated generated alerts
  - `read_at` (timestamptz, nullable) — when the user opened the notification
  - `created_at` (timestamptz)

## Modified Tables
- `user_preferences` is not structurally changed. The existing JSON preference store will hold
  the `notification_preferences` record for each application user.

## Security
- RLS is enabled on `app_notifications`.
- The current application uses the demo-user session through the anon key, so anon and
  authenticated CRUD access follows the existing application data pattern. Client queries are
  tenant- and user-scoped.
- Grants are limited to the operations required by the notification inbox.

## Important Notes
1. Notification generation is de-duplicated by `dedupe_key`, so refreshing My Hub does not
   create duplicate project or deadline alerts.
2. This migration is additive and does not remove or change existing user data.
*/

CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  tenant_name text,
  notification_type text NOT NULL CHECK (notification_type IN ('project_update', 'deadline', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  related_id text,
  related_type text,
  dedupe_key text NOT NULL UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app_notifications TO anon, authenticated;

DROP POLICY IF EXISTS "app_notifications_select" ON app_notifications;
CREATE POLICY "app_notifications_select" ON app_notifications FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "app_notifications_insert" ON app_notifications;
CREATE POLICY "app_notifications_insert" ON app_notifications FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "app_notifications_update" ON app_notifications;
CREATE POLICY "app_notifications_update" ON app_notifications FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created
  ON app_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_unread
  ON app_notifications (user_id, read_at)
  WHERE read_at IS NULL;
