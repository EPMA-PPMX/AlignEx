/*
  # Add Schedule Dates to Projects Table

  1. Changes
    - Add `schedule_start_date` column to store the earliest task start date from DHTMLX Gantt
    - Add `schedule_finish_date` column to store the latest task finish date from DHTMLX Gantt
  
  2. Notes
    - These dates are calculated from the project's task schedule
    - Values are nullable as projects may not have tasks yet
    - These dates represent the overall project timeline based on task scheduling
*/

-- Add schedule start and finish dates
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS schedule_start_date timestamptz,
ADD COLUMN IF NOT EXISTS schedule_finish_date timestamptz;
