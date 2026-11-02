/*
# Timesheet submission uniqueness and entry ownership

1. Modified Tables
- `timesheet_submissions`: adds a unique index on (user_email, week_start_date) so one user has at most one timesheet per week. Submitting uses this key to update the existing week instead of creating duplicates.
- `timesheet_entries`: time entries saved as the placeholder owner 'anonymous' are reassigned to the demo user's email, so each entry can be matched to its submission in Timesheet Approvals.

2. Security
- No policy or grant changes.

3. Important Notes
- The index creation is idempotent (IF NOT EXISTS).
- The reassignment only touches rows whose owner is still 'anonymous'.
*/

CREATE UNIQUE INDEX IF NOT EXISTS timesheet_submissions_user_week_key
  ON public.timesheet_submissions (user_email, week_start_date);

UPDATE public.timesheet_entries
SET user_id = 'pranav.parab@tcs.com'
WHERE user_id = 'anonymous';
