import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar } from 'lucide-react';
import './Scheduler.css';

declare global {
  interface Window {
    scheduler: any;
  }
}

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
  const [isSchedulerInitialized, setIsSchedulerInitialized] = useState(false);
  const initializationAttempted = useRef(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [events, setEvents] = useState<SchedulerEvent[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchResources();
  }, []);

  useEffect(() => {
    const loadScheduler = async () => {
      if (schedulerContainer.current && !initializationAttempted.current) {
        console.log('Initializing scheduler...', 'Container exists:', !!schedulerContainer.current);
        initializationAttempted.current = true;

        const schedulerModule = await import('dhtmlx-scheduler');
        const scheduler = schedulerModule.scheduler;

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
        scheduler.config.drag_move = false;
        scheduler.config.drag_resize = false;
        scheduler.config.readonly = true;

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

        scheduler.init(schedulerContainer.current, new Date(), 'week');
        console.log('Scheduler initialized successfully');
        setIsSchedulerInitialized(true);
      }
    };

    loadScheduler();

    return () => {
      console.log('Cleaning up scheduler...');
      if (window.scheduler && window.scheduler.destructor) {
        try {
          window.scheduler.destructor();
        } catch (e) {
          console.error('Error destroying scheduler:', e);
        }
      }
      initializationAttempted.current = false;
      setIsSchedulerInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (isSchedulerInitialized) {
      fetchTasksAndLoadScheduler();
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
          }

          if (task.end_date) {
            const endStr = String(task.end_date).split(' ')[0];
            endDate = new Date(endStr);
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
          }

          if (!startDate || !endDate) continue;

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

      if (window.scheduler && window.scheduler.clearAll) {
        console.log('Clearing and parsing events into scheduler');
        window.scheduler.clearAll();
        window.scheduler.parse(schedulerEvents);
        console.log('Scheduler events parsed successfully');
      } else {
        console.error('Scheduler not initialized yet');
      }
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
