import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar } from 'lucide-react';
import { useNotification } from '../../lib/useNotification';
import { scheduler } from '../../lib/dhtmlxscheduler/scheduler-wrapper';
import '../../lib/dhtmlxscheduler/dhtmlxscheduler.css';
import './Scheduler.css';

interface Project {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  display_name: string;
}

interface SchedulerEvent {
  id: string | number;
  text: string;
  start_date: Date;
  end_date: Date;
  project_name?: string;
  resource_names?: string;
  task_id?: string;
  project_id?: string;
}

interface SchedulerProps {
  projectId?: string;
}

export default function Scheduler({ projectId }: SchedulerProps = {}) {
  const schedulerContainer = useRef<HTMLDivElement>(null);
  const schedulerInstance = useRef<any>(null);
  const [isSchedulerInitialized, setIsSchedulerInitialized] = useState(false);
  const initializationAttempted = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [events, setEvents] = useState<SchedulerEvent[]>([]);
  const { showNotification } = useNotification();
  const notificationRef = useRef(showNotification);

  // Keep notification ref up to date
  useEffect(() => {
    notificationRef.current = showNotification;
  }, [showNotification]);

  useEffect(() => {
    fetchProjects();
    fetchResources();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadScheduler = async () => {
      if (initializationAttempted.current) {
        console.log('Skipping scheduler init: already attempted');
        return;
      }

      if (!schedulerContainer.current) {
        console.log('Container not ready, will retry...');
        // Container not ready yet, retry after a short delay
        setTimeout(() => {
          if (isMounted && !initializationAttempted.current) {
            loadScheduler();
          }
        }, 50);
        return;
      }

      console.log('Initializing scheduler...', 'Container exists:', !!schedulerContainer.current);
      initializationAttempted.current = true;

      try {
        if (!isMounted) {
          console.log('Component unmounted, aborting');
          return;
        }

        // If scheduler was previously initialized, we need to clean it up carefully
        if (scheduler._obj || scheduler.$initialized) {
          try {
            console.log('Cleaning up previous scheduler instance...');
            console.log('Previous _obj:', scheduler._obj);
            console.log('Previous $initialized:', scheduler.$initialized);

            if (scheduler.clearAll) {
              scheduler.clearAll();
            }

            // Reset the internal state to allow re-initialization
            scheduler._obj = null;
            scheduler.$initialized = false;

            console.log('After cleanup - _obj:', scheduler._obj, '$initialized:', scheduler.$initialized);
          } catch (e) {
            console.log('Error during scheduler cleanup:', e);
          }
        }

        // Store in both ref and window for compatibility
        schedulerInstance.current = scheduler;
        window.scheduler = scheduler;

        scheduler.skin = 'terrace';
        scheduler.config.header = [
          'day',
          'week',
          'month',
          'date',
          'prev',
          'today',
          'next'
        ];

        scheduler.config.first_hour = 8;
        scheduler.config.last_hour = 18;
        scheduler.config.hour_date = '%g:%i %A';
        scheduler.config.details_on_create = false;
        scheduler.config.details_on_dblclick = false;
        scheduler.config.dblclick_create = false;
        scheduler.config.drag_create = false;
        scheduler.config.drag_move = true;  // Enable drag and drop
        scheduler.config.drag_resize = true;  // Enable resizing
        scheduler.config.readonly = false;  // Make editable
        scheduler.config.mark_now = true;  // Show current time marker

        scheduler.templates.event_text = function(start: Date, end: Date, event: any) {
          let html = '<b>' + event.text + '</b>';
          if (event.project_name) {
            html += '<br/><span style="color: #6b7280;">Project: ' + event.project_name + '</span>';
          }
          if (event.resource_names) {
            html += '<br/><span style="color: #3b82f6;">Resources: ' + event.resource_names + '</span>';
          }
          return html;
        };

        scheduler.templates.tooltip_text = function(start: Date, end: Date, event: any) {
          let html = '<b>' + event.text + '</b><br/>';
          html += 'Start: ' + scheduler.templates.tooltip_date_format(start) + '<br/>';
          html += 'End: ' + scheduler.templates.tooltip_date_format(end) + '<br/>';
          if (event.project_name) {
            html += 'Project: ' + event.project_name + '<br/>';
          }
          if (event.resource_names) {
            html += 'Resources: ' + event.resource_names;
          }
          return html;
        };

        // Handle task drag and resize events
        scheduler.attachEvent("onEventChanged", async function(id: any, event: any) {
          console.log('Task changed:', id, event);

          if (!event.task_id || !event.project_id) {
            console.warn('Cannot update task: missing task_id or project_id');
            return true;
          }

          try {
            // Fetch the current project_tasks record
            const { data: projectTasksData, error: fetchError } = await supabase
              .from('project_tasks')
              .select('task_data')
              .eq('project_id', event.project_id)
              .single();

            if (fetchError) throw fetchError;

            if (!projectTasksData?.task_data?.data) {
              console.error('No task data found');
              return false;
            }

            // Find and update the specific task
            const tasks = projectTasksData.task_data.data;
            const taskIndex = tasks.findIndex((t: any) => t.id === event.task_id);

            if (taskIndex === -1) {
              console.error('Task not found in data');
              return false;
            }

            // Calculate duration in working days (excluding weekends)
            const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
              let days = 0;
              const current = new Date(startDate);
              const end = new Date(endDate);

              while (current < end) {
                const dayOfWeek = current.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                  days++;
                }
                current.setDate(current.getDate() + 1);
              }

              return days;
            };

            // Format dates to YYYY-MM-DD HH:MM
            const formatDate = (date: Date): string => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day} 00:00`;
            };

            const newStartDate = formatDate(event.start_date);
            const newEndDate = formatDate(event.end_date);
            const newDuration = calculateWorkingDays(event.start_date, event.end_date);

            // Update the task
            tasks[taskIndex] = {
              ...tasks[taskIndex],
              start_date: newStartDate,
              end_date: newEndDate,
              duration: newDuration
            };

            // Save back to database
            const { error: updateError } = await supabase
              .from('project_tasks')
              .update({
                task_data: {
                  ...projectTasksData.task_data,
                  data: tasks
                }
              })
              .eq('project_id', event.project_id);

            if (updateError) throw updateError;

            console.log('Task updated successfully in database');
            notificationRef.current('Task dates updated successfully', 'success');
            return true;
          } catch (error) {
            console.error('Error updating task:', error);
            notificationRef.current('Failed to update task dates', 'error');
            return false;
          }
        });

        if (!isMounted || !schedulerContainer.current) {
          console.log('Component unmounted before init, aborting');
          return;
        }

        // Small delay to ensure DOM is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted || !schedulerContainer.current) {
          console.log('Component unmounted during delay, aborting');
          return;
        }

        // Verify container is in the DOM
        if (!document.contains(schedulerContainer.current)) {
          console.error('Container element is not in the DOM');
          initializationAttempted.current = false;
          return;
        }

        try {
          // Force re-initialization even if already initialized
          const currentDate = new Date();
          console.log('Calling scheduler.init() with container:', schedulerContainer.current);
          scheduler.init(schedulerContainer.current, currentDate, 'week');

          // Verify initialization succeeded
          console.log('Scheduler initialized successfully');
          console.log('Scheduler._obj:', scheduler._obj);
          console.log('Scheduler._obj === container:', scheduler._obj === schedulerContainer.current);

          if (!scheduler._obj) {
            console.error('Scheduler._obj is still null after init - initialization failed!');
            initializationAttempted.current = false;
            return;
          }
        } catch (initError) {
          console.error('Error during scheduler.init():', initError);
          initializationAttempted.current = false;
          return;
        }
        console.log('Scheduler container size:', {
          width: schedulerContainer.current.offsetWidth,
          height: schedulerContainer.current.offsetHeight
        });
        console.log('Scheduler instance:', schedulerInstance.current);
        console.log('Scheduler methods available:', {
          clearAll: typeof schedulerInstance.current.clearAll,
          parse: typeof schedulerInstance.current.parse,
          getEvents: typeof schedulerInstance.current.getEvents,
          addEvent: typeof schedulerInstance.current.addEvent,
          updateView: typeof schedulerInstance.current.updateView
        });

        // Wait a bit to ensure scheduler is fully ready
        await new Promise(resolve => setTimeout(resolve, 200));

        if (isMounted) {
          console.log('Marking scheduler as initialized');
          setIsSchedulerInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing scheduler:', error);
        initializationAttempted.current = false;
      }
    };

    loadScheduler();

    return () => {
      isMounted = false;
      console.log('Cleaning up scheduler...');

      // Mark as uninitialized first to prevent any pending operations
      setIsSchedulerInitialized(false);

      if (schedulerInstance.current) {
        try {
          // Clear all events but don't call destructor (it breaks re-init)
          schedulerInstance.current.clearAll();
          console.log('Scheduler events cleared');
        } catch (e) {
          console.error('Error clearing scheduler:', e);
        }
      }

      // Don't clear the scheduler instance reference completely
      // Just reset the initialization flag to allow re-initialization
      initializationAttempted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isSchedulerInitialized) {
      // Add a small delay to ensure scheduler DOM is fully ready
      const timer = setTimeout(() => {
        fetchTasksAndLoadScheduler();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSchedulerInitialized, selectedProject, selectedResource, projectId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, display_name')
        .eq('status', 'active')
        .order('display_name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchTasksAndLoadScheduler = async () => {
    const scheduler = schedulerInstance.current;

    if (!scheduler || !scheduler.clearAll || !scheduler.parse || !scheduler._obj) {
      console.error('Scheduler not ready yet, skipping data load', {
        hasScheduler: !!scheduler,
        hasClearAll: !!scheduler?.clearAll,
        hasParse: !!scheduler?.parse,
        hasObj: !!scheduler?._obj
      });
      return;
    }

    // Double-check the scheduler has a valid DOM reference
    if (!scheduler._obj || !document.contains(scheduler._obj)) {
      console.error('Scheduler DOM element is invalid or not in document');
      return;
    }

    try {
      console.log('Fetching tasks for projectId:', projectId);
      let query = supabase
        .from('project_tasks')
        .select('task_data, project_id, projects(name)');

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data: projectTasksData, error } = await query;

      if (error) throw error;

      console.log('Project tasks data:', projectTasksData);

      const schedulerEvents: SchedulerEvent[] = [];
      let eventIdCounter = 1;

      for (const projectRecord of projectTasksData || []) {
        console.log('Processing project record:', projectRecord);
        if (!projectRecord.task_data?.data) {
          console.log('No task_data.data for this record');
          continue;
        }

        const tasks = projectRecord.task_data.data;
        const projectName = (projectRecord.projects as any)?.name || 'Unknown Project';

        console.log(`Processing ${tasks.length} tasks for project: ${projectName}`);

        for (const task of tasks) {
          console.log('Processing task:', task.text, 'start_date:', task.start_date);
          if (!task.start_date || !task.text) {
            console.log('Skipping task - missing start_date or text');
            continue;
          }

          let startDate: Date | null = null;
          let endDate: Date | null = null;

          if (task.start_date) {
            const startStr = String(task.start_date).split(' ')[0];
            startDate = new Date(startStr);
            console.log(`Parsed start date for "${task.text}":`, startStr, '→', startDate);
          }

          if (task.end_date) {
            const endStr = String(task.end_date).split(' ')[0];
            endDate = new Date(endStr);
            console.log(`Parsed end date for "${task.text}":`, endStr, '→', endDate);
          } else if (startDate && task.duration) {
            endDate = new Date(startDate);
            let daysToAdd = task.duration;
            while (daysToAdd > 0) {
              endDate.setDate(endDate.getDate() + 1);
              const dayOfWeek = endDate.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                daysToAdd--;
              }
            }
            console.log(`Calculated end date for "${task.text}" (duration ${task.duration}):`, endDate);
          }

          if (!startDate || !endDate) {
            console.log(`Skipping task "${task.text}" - invalid dates:`, { startDate, endDate });
            continue;
          }

          let resourceNames = '';
          if (task.resource_ids && task.resource_ids.length > 0) {
            if (selectedResource !== 'all' && !task.resource_ids.includes(selectedResource)) {
              continue;
            }

            const { data: resourceData } = await supabase
              .from('resources')
              .select('display_name')
              .in('id', task.resource_ids);

            if (resourceData && resourceData.length > 0) {
              resourceNames = resourceData.map((r: any) => r.display_name).join(', ');
            }
          } else if (selectedResource !== 'all') {
            continue;
          }

          schedulerEvents.push({
            id: eventIdCounter++,
            text: task.text,
            start_date: startDate,
            end_date: endDate,
            project_name: projectName,
            resource_names: resourceNames || 'Unassigned',
            task_id: task.id,
            project_id: projectRecord.project_id
          });
        }
      }

      console.log(`Created ${schedulerEvents.length} scheduler events:`, schedulerEvents);
      setEvents(schedulerEvents);

      console.log('Clearing and parsing events into scheduler');
      console.log('Sample event:', schedulerEvents[0]);
      console.log('Event date types:', schedulerEvents[0] ? {
        start: typeof schedulerEvents[0].start_date,
        end: typeof schedulerEvents[0].end_date,
        startValue: schedulerEvents[0].start_date,
        endValue: schedulerEvents[0].end_date
      } : 'No events');

      // Ensure scheduler is ready before manipulating events
      if (!scheduler || !schedulerContainer.current) {
        console.error('Scheduler not ready, aborting event load');
        return;
      }

      console.log('Loading events into scheduler using parse...');

      // Clear existing events and load new ones
      scheduler.clearAll();

      // Use parse() instead of addEvent() - it's the recommended way
      scheduler.parse(schedulerEvents, 'json');

      const loadedEvents = scheduler.getEvents();
      console.log(`Successfully loaded ${loadedEvents.length} events into scheduler`);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  return (
    <div className="scheduler-wrapper">
      {!projectId && (
        <>
          <div className="scheduler-header">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2>Task Scheduler</h2>
            </div>
            <p>View and track all project tasks in calendar format</p>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Tip:</span> Drag tasks to change dates or resize to adjust duration. Changes sync with Gantt view.
            </p>
          </div>

          <div className="filters-container">
            <div className="project-filter">
              <label htmlFor="project-filter">Project:</label>
              <select
                id="project-filter"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="resource-filter">
              <label htmlFor="resource-filter">Resource:</label>
              <select
                id="resource-filter"
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
              >
                <option value="all">All Resources</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {projectId && (
        <div className="filters-container">
          <div className="resource-filter">
            <label htmlFor="resource-filter">Filter by Resource:</label>
            <select
              id="resource-filter"
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
            >
              <option value="all">All Resources</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="scheduler-container">
        <div ref={schedulerContainer} className="dhx_cal_container" style={{ width: '100%', height: '100%' }}>
          <div className="dhx_cal_navline">
            <div className="dhx_cal_prev_button"></div>
            <div className="dhx_cal_next_button"></div>
            <div className="dhx_cal_today_button"></div>
            <div className="dhx_cal_date"></div>
            <div className="dhx_cal_tab" data-tab="day"></div>
            <div className="dhx_cal_tab" data-tab="week"></div>
            <div className="dhx_cal_tab" data-tab="month"></div>
          </div>
          <div className="dhx_cal_header"></div>
          <div className="dhx_cal_data"></div>
        </div>
      </div>
    </div>
  );
}
