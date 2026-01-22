import React, { Component, createRef } from "react";
import { gantt } from "../../lib/dhtmlxgantt/gantt-wrapper";
import "../../lib/dhtmlxgantt/dhtmlxgantt.css";
import "./Gantt.css";
import { supabase } from "../../lib/supabase";

// Define TypeScript interfaces for props and tasks
interface Task {
  id: number;
  text: string;
  start_date: string;
  duration: number;
  progress?: number;
  parent?: number;
  type?: string;
}

interface Link {
  id: number;
  source: number;
  target: number;
  type: string;
}

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  field_description?: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
}

interface Resource {
  id: string;
  text: string;
  unit?: string;
  parent?: string;
}

interface ResourceAssignment {
  id: string;
  task_id: number;
  resource_id: string;
  value?: number;
}

interface GanttProps {
  projecttasks: {
    data: Task[];
    links?: Link[];
    baseline?: any[];
    resources?: Resource[];
    resourceAssignments?: ResourceAssignment[];
  };
  onTaskUpdate?: () => void;
  onOpenTaskModal?: (parentId?: number) => void;
  onEditTask?: (taskId: number) => void;
  onTaskSelect?: (taskId: number | null) => void;
  onTaskMultiSelect?: (taskIds: number[]) => void;
  searchQuery?: string;
  selectedTaskFields?: string[];
  taskCustomFields?: CustomField[];
  showResourcePanel?: boolean;
  projectStartDate?: string;
  projectId?: string;
}

interface GanttState {}

export default class Gantt extends Component<GanttProps, GanttState> {
  private ganttContainer = createRef<HTMLDivElement>();
  private pendingParentId: number | undefined = undefined;
  private allTasks: Task[] = [];
  private isGrouped: boolean = false;
  private originalTasks: any[] = [];
  private originalLinks: any[] = [];
  private groupHeaderIdStart: number = 999900;
  private resizeObserver: ResizeObserver | null = null;
  private readonly skipWeekends: boolean = true; // Always skip weekends by default
  private userId: string = 'anonymous'; // Default user ID for preferences
  private isUndoRedoInProgress = false;
  private eventHandlersAttached = false;
  private displayedBaselineNum: number = 0; // Track which baseline is currently displayed

  constructor(props: GanttProps) {
    super(props);
    this.state = {};
  }

  // Save grid width preference to database
  private async saveGridWidthPreference(gridWidth: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: this.userId,
          preference_key: 'gantt_grid_width',
          preference_value: { width: gridWidth },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        });

      if (error) {
        console.error('Error saving grid width preference:', error);
      } else {
        console.log('Grid width preference saved:', gridWidth);
      }
    } catch (error) {
      console.error('Error saving grid width preference:', error);
    }
  }

  // Load grid width preference from database
  private async loadGridWidthPreference(): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', this.userId)
        .eq('preference_key', 'gantt_grid_width')
        .maybeSingle();

      if (error) {
        console.error('Error loading grid width preference:', error);
        return null;
      }

      if (data && data.preference_value && typeof data.preference_value.width === 'number') {
        console.log('Grid width preference loaded:', data.preference_value.width);
        return data.preference_value.width;
      }

      return null;
    } catch (error) {
      console.error('Error loading grid width preference:', error);
      return null;
    }
  }

  // Save zoom level preference to database (per project)
  private async saveZoomLevelPreference(zoomLevel: string): Promise<void> {
    const { projectId } = this.props;
    if (!projectId) return;

    try {
      const preferenceKey = `gantt_zoom_level_${projectId}`;
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: this.userId,
          preference_key: preferenceKey,
          preference_value: { zoom_level: zoomLevel },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        });

      if (error) {
        console.error('Error saving zoom level preference:', error);
      } else {
        console.log('Zoom level preference saved:', zoomLevel, 'for project:', projectId);
      }
    } catch (error) {
      console.error('Error saving zoom level preference:', error);
    }
  }

  // Load zoom level preference from database (per project)
  private async loadZoomLevelPreference(): Promise<string | null> {
    const { projectId } = this.props;
    if (!projectId) return null;

    try {
      const preferenceKey = `gantt_zoom_level_${projectId}`;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', this.userId)
        .eq('preference_key', preferenceKey)
        .maybeSingle();

      if (error) {
        console.error('Error loading zoom level preference:', error);
        return null;
      }

      if (data && data.preference_value && typeof data.preference_value.zoom_level === 'string') {
        console.log('Zoom level preference loaded:', data.preference_value.zoom_level, 'for project:', projectId);
        return data.preference_value.zoom_level;
      }

      return null;
    } catch (error) {
      console.error('Error loading zoom level preference:', error);
      return null;
    }
  }

  public isGroupedByOwner = (): boolean => {
    return this.isGrouped;
  };

  public getGanttInstance = () => {
    return gantt;
  };

  public importFromMSProject = (file: File, callback: (success: boolean, data?: any, error?: string) => void): void => {
    if (!file) {
      callback(false, null, 'No file provided');
      return;
    }

    console.log('=== Importing MS Project file ===');
    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('File type:', file.type);

    gantt.importFromMSProject({
      data: file,
      durationUnit: "day",
      server: file.size > 4 * 1024 * 1024 ? "https://export.dhtmlx.com/gantt/project" : "https://export.dhtmlx.com/gantt",
      callback: (project: any) => {
        console.log('=== MS Project Import Response ===');
        console.log('Full project response:', project);
        console.log('Project data:', project.data);
        console.log('Tasks count:', project.data?.data?.length || 0);
        console.log('Links count:', project.data?.links?.length || 0);
        console.log('Resources:', project.data?.resources);
        console.log('Resource assignments:', project.data?.resourceAssignments);
        console.log('Sample task with resources:', project.data?.data?.[0]);

        if (project && project.data) {
          callback(true, project.data);
        } else {
          callback(false, null, 'Failed to parse MS Project file');
        }
      }
    });
  };

  // Helper function to calculate end date correctly (inclusive)
  public setBaseline = (baselineNum: number = 0): any[] => {
    const baselineData: any[] = [];

    // Update the displayed baseline number to match the one being set
    this.displayedBaselineNum = baselineNum;

    // Store all task IDs first to ensure we process all tasks
    const taskIds: any[] = [];
    gantt.eachTask((task: any) => {
      // Skip group headers
      if (task.$group_header) return;
      taskIds.push(task.id);
    });

    console.log(`Setting baseline ${baselineNum} for ${taskIds.length} tasks`);

    // Use batchUpdate to process all tasks at once without triggering individual re-renders
    gantt.batchUpdate(() => {
      // Process each task
      taskIds.forEach((taskId) => {
        const task = gantt.getTask(taskId);

        // Get current start and end dates - handle both Date objects and strings
        let startDate: Date;
        if (task.start_date instanceof Date) {
          startDate = task.start_date;
        } else if (typeof task.start_date === 'string') {
          startDate = gantt.date.parseDate(task.start_date, "xml_date");
        } else {
          console.warn(`Task ${task.id}: Invalid start_date format`, task.start_date);
          return;
        }

        // Use DHTMLX's calculateEndDate which calculates calendar days (including weekends)
        const endDate = gantt.calculateEndDate(startDate, task.duration);

        // Format dates as YYYY-MM-DD using local date components to avoid timezone issues
        const formatDateLocal = (date: Date): string => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const startDateStr = formatDateLocal(startDate);
        const endDateStr = formatDateLocal(endDate);

        console.log(`Task ${task.id} (${task.text}): Capturing baseline ${baselineNum}`);
        console.log(`  Original start_date: ${task.start_date}`);
        console.log(`  Parsed startDate: ${startDate}`);
        console.log(`  Formatted startDateStr: ${startDateStr}`);
        console.log(`  Calculated endDate: ${endDate}`);
        console.log(`  Formatted endDateStr: ${endDateStr}`);
        console.log(`  Duration: ${task.duration}`);

        // Store baseline fields as STRINGS ONLY (no Date objects)
        // This avoids JSON serialization and timezone issues
        task[`baseline${baselineNum}_startDate`] = startDateStr;
        task[`baseline${baselineNum}_endDate`] = endDateStr;
        task[`baseline${baselineNum}_duration`] = task.duration;

        // Store baseline data for return (for logging purposes)
        baselineData.push({
          task_id: task.id,
          baseline_number: baselineNum,
          [`baseline${baselineNum}_startDate`]: startDateStr,
          [`baseline${baselineNum}_endDate`]: endDateStr,
          [`baseline${baselineNum}_duration`]: task.duration
        });
      });
    });

    console.log(`Setting baseline ${baselineNum} with fields: baseline${baselineNum}_startDate, baseline${baselineNum}_endDate, baseline${baselineNum}_duration`);
    console.log('Baseline data:', baselineData);
    console.log(`Successfully set baseline for ${baselineData.length} tasks`);

    // Verify that all tasks have baseline data set
    let verifiedCount = 0;
    console.log('\n=== BASELINE VERIFICATION ===');
    gantt.eachTask((task: any) => {
      if (task.$group_header) return;
      const baselineStartField = `baseline${baselineNum}_startDate`;
      const baselineEndField = `baseline${baselineNum}_endDate`;
      if (task[baselineStartField] && task[baselineEndField]) {
        verifiedCount++;

        // Format current start_date for comparison
        const currentStartStr = task.start_date instanceof Date
          ? `${task.start_date.getFullYear()}-${String(task.start_date.getMonth() + 1).padStart(2, '0')}-${String(task.start_date.getDate()).padStart(2, '0')}`
          : task.start_date;

        console.log(`Task ${task.id} (${task.text}):`);
        console.log(`  Current start_date: ${currentStartStr}`);
        console.log(`  Baseline start: ${task[baselineStartField]}`);
        console.log(`  Baseline end: ${task[baselineEndField]}`);
        console.log(`  Match: ${currentStartStr === task[baselineStartField] ? '✓' : '✗ MISMATCH!'}`);
      } else {
        console.warn(`Task ${task.id}: Missing baseline data after setBaseline`);
      }
    });
    console.log(`Verified ${verifiedCount} tasks have baseline data`);
    console.log('=== END VERIFICATION ===\n');

    // Force a full render to trigger addTaskLayer - this now happens only once
    gantt.render();

    return baselineData;
  };

  public zoomIn = (): void => {
    gantt.ext.zoom.zoomIn();
    // Note: onAfterZoom event will handle saving the preference
  };

  public zoomOut = (): void => {
    gantt.ext.zoom.zoomOut();
    // Note: onAfterZoom event will handle saving the preference
  };

  public toggleGroupByOwner = (): void => {
    // Save scroll position before toggling
    const scrollState = gantt.getScrollState();

    if (this.isGrouped) {
      // Remove grouping - restore original tasks
      console.log('Ungrouping: restoring original tasks', this.originalTasks);
      console.log('Ungrouping: restoring original links', this.originalLinks);
      gantt.clearAll();
      // Prepare tasks by removing end_date to recalculate based on current skipWeekends setting
      const preparedTasks = this.prepareTasksForParsing(this.originalTasks);
      gantt.parse({
        data: preparedTasks,
        links: this.originalLinks
      });
      this.isGrouped = false;

      // Restore scroll position
      if (scrollState) {
        setTimeout(() => {
          try {
            gantt.scrollTo(scrollState.x, scrollState.y);
          } catch (e) {
            console.warn('Could not restore scroll position:', e);
          }
        }, 50);
      }
    } else {
      // Save original tasks and links
      this.originalTasks = [];
      this.originalLinks = [];

      gantt.eachTask((task: any) => {
        this.originalTasks.push({ ...task });
      });

      gantt.getLinks().forEach((link: any) => {
        this.originalLinks.push({ ...link });
      });

      console.log('Grouping: saved original tasks', this.originalTasks);
      console.log('Grouping: saved original links', this.originalLinks);

      // Collect all unique resources from tasks
      const resourceMap: { [key: string]: string } = {};
      const resourceTasksMap: { [key: string]: any[] } = {};

      gantt.eachTask((task: any) => {
        // Handle tasks with multiple resources (resource_ids array)
        if (task.resource_ids && Array.isArray(task.resource_ids) && task.resource_ids.length > 0) {
          task.resource_ids.forEach((resourceId: string, index: number) => {
            const resourceName = task.resource_names?.[index] || 'Unknown';

            if (!resourceMap[resourceId]) {
              resourceMap[resourceId] = resourceName;
              resourceTasksMap[resourceId] = [];
            }

            // Add this task to the resource's task list
            resourceTasksMap[resourceId].push({ ...task });
          });
        } else if (task.owner_name && Array.isArray(task.owner_name) && task.owner_name.length > 0) {
          // Handle tasks with multiple owners (owner_name array)
          task.owner_name.forEach((ownerName: string) => {
            const ownerId = ownerName; // Use owner name as ID

            if (!resourceMap[ownerId]) {
              resourceMap[ownerId] = ownerName;
              resourceTasksMap[ownerId] = [];
            }

            // Add this task to the resource's task list
            resourceTasksMap[ownerId].push({ ...task });
          });
        } else {
          // Fallback for tasks with single owner (backward compatibility)
          const ownerId = task.owner_id || 'unassigned';
          const ownerName = task.owner_name || 'Unassigned';

          if (!resourceMap[ownerId]) {
            resourceMap[ownerId] = ownerName;
            resourceTasksMap[ownerId] = [];
          }

          resourceTasksMap[ownerId].push({ ...task });
        }
      });

      // Create new task structure with group headers
      const newTasks: any[] = [];
      let groupId = this.groupHeaderIdStart;
      const taskIdMapping: { [key: number]: number[] } = {}; // Maps original task ID to new IDs

      // Sort resources by name
      const sortedResourceIds = Object.keys(resourceMap).sort((a, b) => {
        return resourceMap[a].localeCompare(resourceMap[b]);
      });

      sortedResourceIds.forEach((resourceId) => {
        const resourceName = resourceMap[resourceId];

        // Add group header
        const groupHeader = {
          id: groupId++,
          text: `👤 ${resourceName}`,
          start_date: null,
          duration: null,
          parent: 0,
          type: gantt.config.types.project,
          open: true,
          readonly: true,
          owner_name: '',
          $group_header: true
        };
        newTasks.push(groupHeader);

        // Add tasks under this group
        resourceTasksMap[resourceId].forEach((task: any) => {
          // Create a unique ID for this task instance under this resource
          const newTaskId = groupId++;

          // Track mapping for tasks that appear under multiple resources
          if (!taskIdMapping[task.id]) {
            taskIdMapping[task.id] = [];
          }
          taskIdMapping[task.id].push(newTaskId);

          newTasks.push({
            ...task,
            id: newTaskId, // Use new unique ID
            $original_id: task.id, // Store original ID
            parent: groupHeader.id,
            $original_parent: task.parent
          });
        });
      });

      // Clear and reload with grouped structure
      gantt.clearAll();
      // Prepare tasks by removing end_date to recalculate based on current skipWeekends setting
      const preparedTasks = this.prepareTasksForParsing(newTasks);
      gantt.parse({
        data: preparedTasks,
        links: []
      });

      this.isGrouped = true;

      // Restore scroll position
      if (scrollState) {
        setTimeout(() => {
          try {
            gantt.scrollTo(scrollState.x, scrollState.y);
          } catch (e) {
            console.warn('Could not restore scroll position:', e);
          }
        }, 50);
      }
    }
  };

  // renderBaselines is no longer needed - using gantt.addTaskLayer instead
  // This method is kept for backward compatibility but does nothing
  private renderBaselines = (): void => {
    // Baselines are now rendered automatically via gantt.addTaskLayer
    // See gantt.init() for the addTaskLayer implementation
  };

  private buildGanttColumns = () => {
    const { selectedTaskFields = [], taskCustomFields = [] } = this.props;

    // Define text and date editors
    const textEditor = { type: "text", map_to: "text" };
    const dateEditor = { type: "date", map_to: "start_date" };
    const durationEditor = { type: "number", map_to: "duration", min: 0, max: 100 };

    // Base columns
    const baseColumns: any[] = [
      {
        name: "edit",
        label: "",
        width: 40,
        align: "center",
        template: (task: any) => {
          if (task.$group_header) return "";
          return `<div class="gantt_edit_btn" data-task-id="${task.$original_id || task.id}" title="Edit task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>`;
        }
      },
      {
        name: "wbs",
        label: "WBS",
        width: 60,
        resize: true,
        template: gantt.getWBSCode
      },
      { name: "text", label: "Task name", tree: true, width: 250, min_width: 150, max_width: 500, resize: true, editor: textEditor },
      {
        name: "owner_name",
        label: "Owners",
        align: "center",
        width: 150,
        resize: true,
        template: (task: any) => {
          if (task.$group_header) return "";

          // Handle resource_ids array (multi-resource assignments)
          if (task.resource_ids && Array.isArray(task.resource_ids) && task.resource_ids.length > 0) {
            const owners = task.resource_names || [];
            if (owners.length === 0) return "Unassigned";

            const badges = owners.map((name: string, index: number) => {
              const initial = name.charAt(0).toUpperCase();
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              const color = colors[index % colors.length];
              return `<span class="owner-badge" style="background-color: ${color};" title="${name}">${initial}</span>`;
            }).join('');

            return `<div class="owner-badges-container">${badges}</div>`;
          }

          // Handle owner_name as array (multi-owner tasks)
          if (task.owner_name && Array.isArray(task.owner_name) && task.owner_name.length > 0) {
            const owners = task.owner_name;
            const badges = owners
              .filter((name: any) => name && typeof name === 'string')
              .map((name: string, index: number) => {
                const initial = name.charAt(0).toUpperCase();
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                const color = colors[index % colors.length];
                return `<span class="owner-badge" style="background-color: ${color};" title="${name}">${initial}</span>`;
              }).join('');

            return badges ? `<div class="owner-badges-container">${badges}</div>` : "Unassigned";
          }

          // Handle owner_name as string (legacy single-owner tasks)
          if (task.owner_name && typeof task.owner_name === 'string') {
            return task.owner_name;
          }

          return "Unassigned";
        }
      },
      {
        name: "start_date",
        label: "Start time",
        align: "center",
        width: 150,
        resize: true,
        editor: dateEditor,
        template: (task: any) => {
          if (task.$group_header) return "";
          if (task.start_date) {
            const startDate = typeof task.start_date === 'string'
              ? gantt.date.parseDate(task.start_date, "xml_date")
              : task.start_date;
            // Format as "Mon 12/01/25"
            return gantt.date.date_to_str("%D %m/%d/%y")(startDate);
          }
          return "";
        }
      },
      {
        name: "end_date",
        label: "End time",
        align: "center",
        width: 150,
        resize: true,
        template: (task: any) => {
          if (task.$group_header) return "";
          // Use DHTMLX's calculateEndDate which respects work_time configuration
          if (task.start_date && task.duration) {
            const startDate = typeof task.start_date === 'string'
              ? gantt.date.parseDate(task.start_date, "xml_date")
              : task.start_date;
            // DHTMLX uses exclusive end dates (end_date = start of day after task completes)
            // Subtract 1 day to show the inclusive end date (actual last day of the task)
            const exclusiveEndDate = gantt.calculateEndDate(startDate, task.duration);
            const inclusiveEndDate = gantt.date.add(exclusiveEndDate, -1, "day");
            // Format as "Mon 12/01/25" to match Start time format
            return gantt.date.date_to_str("%D %m/%d/%y")(inclusiveEndDate);
          }
          return "";
        }
      },
      {
        name: "duration",
        label: "Duration",
        align: "center",
        width: 70,
        resize: true,
        editor: durationEditor,
        template: (task: any) => {
          if (task.$group_header) return "";
          return task.duration || 0;
        }
      },
      {
        name: "work_hours",
        label: "Work (hrs)",
        align: "center",
        width: 90,
        resize: true,
        template: (task: any) => {
          if (task.$group_header) return "";
          if (task.work_hours !== undefined && task.work_hours !== null) {
            return task.work_hours.toFixed(2);
          }
          return "-";
        }
      },
      {
        name: "progress",
        label: "Progress",
        align: "center",
        width: 80,
        resize: true,
        template: (task: any) => {
          if (task.$group_header) return "";

          const progress = Math.round((task.progress || 0) * 100);
          const radius = 12;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (progress / 100) * circumference;

          return `
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
              <svg width="30" height="30" style="transform: rotate(-90deg);">
                <circle
                  cx="15"
                  cy="15"
                  r="${radius}"
                  stroke="#e5e7eb"
                  stroke-width="3"
                  fill="none"
                />
                <circle
                  cx="15"
                  cy="15"
                  r="${radius}"
                  stroke="#3b82f6"
                  stroke-width="3"
                  fill="none"
                  stroke-dasharray="${circumference}"
                  stroke-dashoffset="${strokeDashoffset}"
                  stroke-linecap="round"
                />
                <text
                  x="15"
                  y="15"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  font-size="8"
                  fill="#374151"
                  transform="rotate(90 15 15)"
                >
                  ${progress}%
                </text>
              </svg>
            </div>
          `;
        }
      }
    ];

    // Add custom field columns
    selectedTaskFields.forEach(fieldId => {
      const field = taskCustomFields.find(f => f.id === fieldId);
      if (field) {
        baseColumns.push({
          name: `custom_${field.field_name}`,
          label: field.field_label,
          align: "center",
          width: 150,
          resize: true,
          template: (task: any) => {
            if (task.$group_header) return "";
            const value = task[`custom_${field.field_name}`];
            return value !== undefined && value !== null ? String(value) : "";
          }
        });
      }
    });

    // Add the "add" button column at the end
    baseColumns.push({ name: "add", label: "", width: 44 });

    gantt.config.columns = baseColumns;
  };

  async componentDidMount(): Promise<void> {
    if (!this.ganttContainer.current) return;

    gantt.license = "39548339";

    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.readonly = false;
    gantt.config.details_on_dblclick = true;

    // Configure work time - always skip weekends by default
    gantt.config.duration_unit = "day";
    gantt.config.skip_off_time = false; // Always show weekends in chart (never hide them)

    // Apply work time configuration to skip weekends
    this.updateWorkTimeConfig(this.skipWeekends);

    console.log("=== DHTMLX Gantt Configuration ===");
    console.log("work_time enabled:", gantt.config.work_time);
    console.log("duration_unit:", gantt.config.duration_unit);
    console.log("skip_off_time:", gantt.config.skip_off_time);
    console.log("skipWeekends:", this.skipWeekends);
    console.log("Duration excludes weekends (working days only)");

    // Enable plugins
    gantt.plugins({
      keyboard_navigation: true,
      auto_scheduling: true, // Enable auto-scheduling for automatic task rescheduling based on dependencies
      inline_editors: true,
      export_api: true, // Enable MS Project import/export functionality
      undo: true, // Enable undo/redo functionality
      multiselect: true // Enable multi-task selection
    });

    // Configure undo plugin
    gantt.config.undo = true;
    gantt.config.redo = true;
    gantt.config.undo_steps = 50; // Number of steps to keep in history
    gantt.config.undo_types = {
      update: "update",
      add: "add",
      remove: "remove",
      link: "link"
    };

    gantt.config.keyboard_navigation_cells = true;

    // Configure keyboard shortcuts for inline editing
    gantt.keys.edit_cancel = 27; // Escape key to cancel inline edit

    // Track inline editor state more reliably
    let isInlineEditing = false;
    let editingStartTime = 0;

    gantt.attachEvent("onBeforeLightbox", () => {
      // Lightbox is opening, not our inline editor
      return true;
    });

    gantt.attachEvent("onBeforeInlineEditorStart", () => {
      isInlineEditing = true;
      editingStartTime = Date.now();
      console.log("Inline editor started");
      return true;
    });

    gantt.attachEvent("onAfterInlineEditorClose", () => {
      isInlineEditing = false;
      console.log("Inline editor closed");
      return true;
    });

    // Add keyboard shortcuts for creating new tasks using DOM event
    const ganttElement = this.ganttContainer.current;
    if (ganttElement) {
      ganttElement.addEventListener('keydown', (e: KeyboardEvent) => {
        const keyCode = e.keyCode || e.which;

        // Only handle Enter keys
        if (keyCode !== 13) return;

        // Check if we're in an input, textarea, or contenteditable element
        const target = e.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isEditable = tagName === 'input' ||
                          tagName === 'textarea' ||
                          target.isContentEditable ||
                          target.classList.contains('gantt_cal_light') ||
                          isInlineEditing;

        if (isEditable) {
          console.log("In editable field, skipping task creation");
          return; // Let the default behavior handle it
        }

        console.log("Enter pressed, isEditable:", isEditable, "isInlineEditing:", isInlineEditing);

        // Ctrl+Enter or Cmd+Enter to create subtask
        if (e.ctrlKey || e.metaKey) {
          const selectedTaskId = gantt.getSelectedId();
          console.log("Ctrl+Enter pressed, selectedTaskId:", selectedTaskId);
          if (selectedTaskId && onOpenTaskModal) {
            const task = gantt.getTask(selectedTaskId);
            if (!task.$group_header) {
              onOpenTaskModal(selectedTaskId);
              e.preventDefault();
              e.stopPropagation();
            }
          } else if (onOpenTaskModal) {
            onOpenTaskModal();
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }

        // Plain Enter to create sibling task
        if (!e.shiftKey && !e.altKey) {
          const selectedTaskId = gantt.getSelectedId();
          console.log("Enter pressed, selectedTaskId:", selectedTaskId);
          if (selectedTaskId && onOpenTaskModal) {
            const task = gantt.getTask(selectedTaskId);
            if (!task.$group_header) {
              const parentId = task.parent || undefined;
              console.log("Creating sibling task with parentId:", parentId);
              onOpenTaskModal(parentId);
              e.preventDefault();
              e.stopPropagation();
            }
          } else if (onOpenTaskModal) {
            onOpenTaskModal();
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }, true); // Use capture phase to catch it early
    }

    // Configure auto-scheduling behavior
    gantt.config.auto_scheduling = true; // Enable auto-scheduling
    gantt.config.auto_scheduling_strict = true; // Enforce strict scheduling rules to reschedule to earliest possible date
    gantt.config.auto_scheduling_compatibility = true; // Maintain compatibility with manual edits
    gantt.config.auto_scheduling_use_progress = false; // Include all tasks in auto-scheduling

    // Enable grid resizing - allows dragging the splitter between grid and timeline
    gantt.config.grid_resize = true;
    gantt.config.keep_grid_width = false;

    // Configure zoom levels
    const zoomConfig = {
      levels: [
        {
          name: "day",
          scale_height: 27,
          min_column_width: 80,
          scales: [
            { unit: "day", step: 1, format: "%D %m/%d/%y" }
          ]
        },
        {
          name: "week",
          scale_height: 50,
          min_column_width: 50,
          scales: [
            { unit: "week", step: 1, format: function (date: Date) {
                const dateToStr = gantt.date.date_to_str("%m/%d/%y");
                const endDate = gantt.date.add(date, -6, "day");
                const weekNum = gantt.date.date_to_str("%W")(date);
                return "#" + weekNum + ", " + dateToStr(date) + " - " + dateToStr(endDate);
              }
            },
            { unit: "day", step: 1, format: "%D %m/%d" }
          ]
        },
        {
          name: "month",
          scale_height: 50,
          min_column_width: 120,
          scales: [
            { unit: "month", format: "%F, %Y" },
            { unit: "week", format: "Week #%W" }
          ]
        },
        {
          name: "quarter",
          height: 50,
          min_column_width: 90,
          scales: [
            { unit: "quarter", step: 1, format: function (date: Date) {
                const dateToStr = gantt.date.date_to_str("%m/%d/%y");
                const endDate = gantt.date.add(gantt.date.add(date, 3, "month"), -1, "day");
                return dateToStr(date) + " - " + dateToStr(endDate);
              }
            },
            { unit: "month", step: 1, format: "%M %y" }
          ]
        },
        {
          name: "year",
          scale_height: 50,
          min_column_width: 30,
          scales: [
            { unit: "year", step: 1, format: "%Y" }
          ]
        }
      ]
    };

    // Initialize zoom extension if it exists
    if (gantt.ext && gantt.ext.zoom) {
      gantt.ext.zoom.init(zoomConfig);

      // Load saved zoom level for this project, or use default
      const savedZoomLevel = await this.loadZoomLevelPreference();
      const initialZoomLevel = savedZoomLevel || "day";
      gantt.ext.zoom.setLevel(initialZoomLevel);
      console.log('Initial zoom level set to:', initialZoomLevel);
    }

    // Set grid width - load from preferences or use default (450px minimum to show task name)
    const updateGridWidth = async () => {
      if (this.ganttContainer.current) {
        const containerWidth = this.ganttContainer.current.offsetWidth;

        // Try to load saved preference
        const savedWidth = await this.loadGridWidthPreference();

        if (savedWidth !== null) {
          // Use saved width
          gantt.config.grid_width = savedWidth;
        } else {
          // Use default: 40% of container but at least 450px to show task name column
          const defaultWidth = Math.floor(containerWidth * 0.4);
          gantt.config.grid_width = Math.max(450, defaultWidth);
        }
      }
    };

    await updateGridWidth();
    gantt.config.min_grid_column_width = 50;

    gantt.config.duration_step = 1;
    gantt.config.round_dnd_dates = false;

    const { projecttasks, onTaskUpdate, onOpenTaskModal, onEditTask, showResourcePanel } = this.props;

    // Define inline editors
    const textEditor = { type: "text", map_to: "text" };
    const dateEditor = {
      type: "date",
      map_to: "start_date"
    };
    const durationEditor = {
      type: "number",
      map_to: "duration",
      min: 1,
      max: 365,
      formatter: function(value: any) {
        // Ensure the value is a number
        const num = parseFloat(value);
        return isNaN(num) ? 1 : Math.max(1, num);
      },
      parser: function(value: any) {
        // Parse the input value to ensure it's a valid number
        const num = parseFloat(value);
        return isNaN(num) || num < 1 ? 1 : num;
      }
    };

    // Configure resource management
    if (showResourcePanel) {
      gantt.config.resource_store = "resource";
      gantt.config.resource_property = "owner_id";
      gantt.config.process_resource_assignments = true;
      gantt.config.resource_assignment_store = "resourceAssignments";

      // Configure resource grid columns in gantt.config
      gantt.config.columns = gantt.config.columns || [];

      // Store resource columns separately
      const resourceColumns = [
        {
          name: "text",
          label: "Resource Name",
          tree: true,
          width: 200,
          template: function(resource: any) {
            return resource.text || resource.name || "Unnamed Resource";
          }
        },
        {
          name: "workload",
          label: "Workload",
          align: "center",
          width: 100,
          template: function(resource: any) {
            const assignments = gantt.getDatastore("resourceAssignments").getItems().filter((a: any) => a.resource_id === resource.id);
            return assignments.length + " tasks";
          }
        },
        {
          name: "hours",
          label: "Allocated Hours",
          align: "center",
          width: 135,
          template: function(resource: any) {
            return (resource.hours || 0) + " hrs";
          }
        }
      ];

      // Configure layout with resource panel
      gantt.config.layout = {
        css: "gantt_container",
        rows: [
          {
            cols: [
              {
                width: gantt.config.grid_width || 450,
                min_width: 300,
                rows: [
                  {
                    view: "grid",
                    scrollX: "gridScroll",
                    scrollable: true,
                    scrollY: "scrollVer"
                  },
                  {
                    view: "scrollbar",
                    id: "gridScroll",
                    group: "horizontal"
                  }
                ]
              },
              { resizer: true, width: 1 },
              {
                rows: [
                  {
                    view: "timeline",
                    scrollX: "scrollHor",
                    scrollY: "scrollVer"
                  },
                  {
                    view: "scrollbar",
                    id: "scrollHor",
                    group: "horizontal"
                  }
                ]
              },
              { view: "scrollbar", id: "scrollVer" }
            ],
            gravity: 2
          },
          { resizer: true, width: 1 },
          {
            config: { height: 200 },
            cols: [
              {
                view: "resourceGrid",
                id: "resourceGrid",
                group: "grids",
                width: 450,
                scrollY: "resourceVScroll",
                bind: "resource",
                config: {
                  columns: resourceColumns
                }
              },
              { resizer: true, width: 1 },
              {
                view: "resourceTimeline",
                id: "resourceTimeline",
                scrollX: "scrollHor",
                scrollY: "resourceVScroll",
                bind: "resource"
              },
              { view: "scrollbar", id: "resourceVScroll", group: "vertical" }
            ],
            gravity: 1
          }
        ]
      };
    } else {
      // Configure layout without resource panel
      gantt.config.layout = {
        css: "gantt_container",
        cols: [
          {
            width: gantt.config.grid_width || 450,
            min_width: 300,
            rows: [
              {
                view: "grid",
                scrollX: "gridScroll",
                scrollable: true,
                scrollY: "scrollVer"
              },
              {
                view: "scrollbar",
                id: "gridScroll",
                group: "horizontal"
              }
            ]
          },
          { resizer: true, width: 1 },
          {
            rows: [
              {
                view: "timeline",
                scrollX: "scrollHor",
                scrollY: "scrollVer"
              },
              {
                view: "scrollbar",
                id: "scrollHor",
                group: "horizontal"
              }
            ]
          },
          { view: "scrollbar", id: "scrollVer" }
        ]
      };
    }

    // Configure task types - MUST be done before parsing data
    // DHTMLX Gantt recognizes these specific type values
    gantt.config.types.task = "task";
    gantt.config.types.project = "project";
    gantt.config.types.milestone = "milestone";

    // Enable auto types for WBS
    gantt.config.auto_types = true;

    // Ensure tree structure is visible - open all parent tasks by default
    gantt.config.open_tree_initially = true;

    // Enable branch ordering and tree structure
    gantt.config.order_branch = true;
    gantt.config.order_branch_free = true;

    // Configure WBS code to work properly with parent-child relationships
    gantt.config.wbs_strict = true;

    // Increase row height to accommodate baseline bars
    gantt.config.row_height = 42;
    gantt.config.task_height = 26;

    // Configure milestone bar height to match row positioning
    gantt.config.bar_height = 26;

    // Enable task cells for proper milestone rendering (absolute positioning)
    gantt.config.show_task_cells = true;

    // Build columns dynamically based on selected custom fields
    this.buildGanttColumns();

    // Custom styling for group headers
    gantt.templates.task_class = (start: any, end: any, task: any) => {
      if (task.$group_header) {
        return "group-header-task";
      }
      if (task.type === "milestone" || task.type === gantt.config.types.milestone) {
        return "gantt_milestone";
      }
      if (task.type === "project" || task.type === gantt.config.types.project) {
        return "gantt_project_task";
      }
      return "";
    };

    gantt.templates.grid_row_class = (start: any, end: any, task: any) => {
      if (task.$group_header) {
        return "group-header-row";
      }
      return "";
    };

    // Hide text for milestones - show only diamond
    gantt.templates.rightside_text = function(start: any, end: any, task: any) {
      // No text for milestones
      return "";
    };

    // Hide text inside milestone diamond
    gantt.templates.task_text = function(start: any, end: any, task: any) {
      if (task.type === gantt.config.types.milestone || task.type === "milestone") {
        return "";
      }
      return task.text;
    };

    // Prevent editing group headers
    gantt.attachEvent("onBeforeTaskDrag", (id: any) => {
      const task = gantt.getTask(id);
      return !task.$group_header;
    });

    // Intercept task creation to use custom modal
    if (onOpenTaskModal) {
      // Override the onclick handler for the add button
      gantt.attachEvent("onGanttReady", () => {
        console.log("Gantt is ready, setting up add button handler");
      });

      // Listen for when task is about to be added (BEFORE it's created)
      gantt.attachEvent("onBeforeTaskAdd", (id: any, task: any) => {
        console.log("=== onBeforeTaskAdd Event ===");
        console.log("Task ID:", id);
        console.log("Task object:", task);
        console.log("task.parent:", task.parent);
        console.log("task.$rendered_parent:", task.$rendered_parent);

        // Capture the parent ID from the task
        const parentId = task.parent || task.$rendered_parent;
        this.pendingParentId = (parentId && parentId !== 0) ? parentId : undefined;
        console.log("Captured pendingParentId:", this.pendingParentId);

        // Return false to prevent the task from being added - we'll open our modal instead
        return false;
      });

      // Listen for when a task is created (when Add button is clicked)
      gantt.attachEvent("onTaskCreated", (task: any) => {
        console.log("=== onTaskCreated Event ===");
        console.log("Task object:", task);
        console.log("task.parent:", task.parent);
        console.log("task.$rendered_parent:", task.$rendered_parent);

        // Set default start date to project start date
        const { projectStartDate } = this.props;
        if (projectStartDate) {
          // Set start_date as a Date object (not a string)
          task.start_date = new Date(projectStartDate);
          console.log("Set default start_date to project start date:", task.start_date);
        } else {
          // Fallback to today's date if no project start date
          task.start_date = new Date();
          console.log("Set default start_date to today:", task.start_date);
        }

        // Set default duration
        if (!task.duration) {
          task.duration = 1;
        }

        // Capture the parent - check various parent properties
        const parentId = task.$rendered_parent || task.parent;

        // If we already set pendingParentId, use that; otherwise use task's parent
        if (this.pendingParentId === undefined) {
          this.pendingParentId = (parentId && parentId !== 0) ? parentId : undefined;
        }
        console.log("Final pendingParentId:", this.pendingParentId);
        return true;
      });
    }

    // Handle double-click on task to edit using onTaskDblClick
    gantt.attachEvent("onTaskDblClick", (id: any, e: any) => {
      console.log("onTaskDblClick triggered for task ID:", id);
      console.log("onEditTask callback exists:", !!onEditTask);

      try {
        // Check if the double-click was on a grid cell with an editor
        // If so, allow inline editing to proceed
        const target = e?.target || e?.srcElement;
        if (target) {
          // Check if we're clicking on a grid cell (not the timeline area)
          const gridCell = target.closest('.gantt_cell');
          if (gridCell) {
            console.log("Double-click on grid cell, allowing inline editor");
            return true; // Allow default behavior (inline editing)
          }
        }

        // Check if task exists
        if (!gantt.isTaskExists(id)) {
          console.log("Task does not exist");
          if (onOpenTaskModal) onOpenTaskModal();
          return false;
        }

        // Get the task data
        const task = gantt.getTask(id);
        console.log("Task data:", task);

        // Check if this is a group header
        if (task.$group_header) {
          console.log("Group header clicked, ignoring");
          return false;
        }

        // Check if this is a new task (temporary ID)
        if (!task.text || task.text === "New task") {
          console.log("New task detected, opening create modal");
          const parentId = task.parent || undefined;
          gantt.deleteTask(id);
          if (onOpenTaskModal) onOpenTaskModal(parentId);
          return false;
        }

        // Open custom modal for editing existing tasks
        console.log("Existing task detected, opening edit modal");
        if (onEditTask) {
          // Use original ID if this is a grouped task, otherwise use the current ID
          const taskIdToEdit = task.$original_id || id;
          console.log("Calling onEditTask with ID:", taskIdToEdit, "(original ID from grouped view)");
          onEditTask(taskIdToEdit);
          return false;
        }

        console.log("No edit callback available");
        return true;
      } catch (error) {
        console.error("Error in onTaskDblClick:", error);
        if (onOpenTaskModal) onOpenTaskModal();
        return false;
      }
    });

    // Also handle onBeforeLightbox as a fallback
    gantt.attachEvent("onBeforeLightbox", (id: any) => {
      console.log("=== onBeforeLightbox Event ===");
      console.log("Task ID:", id);
      try {
        // Check if task exists
        if (!gantt.isTaskExists(id)) {
          console.log("Task does not exist");
          if (onOpenTaskModal) onOpenTaskModal(this.pendingParentId);
          this.pendingParentId = undefined;
          return false;
        }

        // Check if this is a new task (temporary ID)
        const task = gantt.getTask(id);
        console.log("Task data:", task);

        // Check if this is a group header
        if (task.$group_header) {
          console.log("Group header in lightbox, ignoring");
          return false;
        }

        if (!task.text || task.text === "New task") {
          console.log("New task detected, opening create modal");
          // Use the pending parent ID we captured in onTaskCreated
          const parentId = this.pendingParentId;
          console.log("Using pendingParentId:", parentId);
          gantt.deleteTask(id);
          if (onOpenTaskModal) onOpenTaskModal(parentId);
          // Reset pending parent
          this.pendingParentId = undefined;
          return false;
        }

        // Open custom modal for editing existing tasks
        console.log("Existing task detected in onBeforeLightbox, opening edit modal");
        if (onEditTask) {
          // Use original ID if this is a grouped task
          const taskIdToEdit = task.$original_id || id;
          console.log("Calling onEditTask with ID:", taskIdToEdit);
          onEditTask(taskIdToEdit);
          return false;
        }

        // Fallback to default lightbox if no edit callback
        console.log("No edit callback, using default lightbox");
        return true;
      } catch (error) {
        console.error("Error in onBeforeLightbox:", error);
        if (onOpenTaskModal) onOpenTaskModal(this.pendingParentId);
        this.pendingParentId = undefined;
        return false;
      }
    });

    // Normalize duration when task is loaded
    gantt.attachEvent("onTaskLoading", (task: any) => {
      if (task.$group_header) return true;

      const originalDuration = task.duration;

      // Ensure duration is properly set and is a valid number
      if (task.duration !== undefined && task.duration !== null) {
        // Convert duration to number if it's a string
        if (typeof task.duration === 'string') {
          task.duration = parseFloat(task.duration);
        }
        // Ensure duration is at least 1
        if (isNaN(task.duration) || task.duration < 1) {
          task.duration = 1;
        }
      } else if (!task.$group_header) {
        // If no duration is set, default to 1 for non-group tasks
        task.duration = 1;
      }

      // Parse start_date if it's a string, but don't recalculate end_date
      // Let DHTMLX calculate end_date from start_date + duration to avoid off-by-one errors
      if (task.start_date && typeof task.start_date === 'string') {
        task.start_date = gantt.date.parseDate(task.start_date, "xml_date");
      }

      if (originalDuration !== task.duration && task.id) {
        console.log(`Task ${task.id}: duration changed in onTaskLoading from ${originalDuration} to ${task.duration}`);
      }

      // Don't calculate end_date here - let DHTMLX do it from duration
      // This prevents off-by-one errors when DHTMLX recalculates duration from end_date
      return true;
    });

    // Log what DHTMLX calculated after parsing
    gantt.attachEvent("onParse", () => {
      console.log("=== After Parse - Checking task durations ===");
      gantt.eachTask((task: any) => {
        if (!task.$group_header && task.id <= 5) { // Log first 5 tasks
          console.log(`Task ${task.id} (${task.text}): duration=${task.duration}, start_date=${task.start_date}, end_date=${task.end_date}`);
        }
      });
      return true;
    });

    // Validate and normalize duration before task is updated
    gantt.attachEvent("onBeforeTaskUpdate", (id: any, task: any) => {
      // Ensure duration is a valid positive number
      if (task.duration !== undefined && task.duration !== null) {
        let duration = task.duration;
        if (typeof duration !== 'number' || isNaN(duration)) {
          duration = parseFloat(duration);
        }
        if (isNaN(duration) || duration < 1) {
          duration = 1;
        }
        // Store duration exactly as entered (no rounding)
        task.duration = Math.max(1, duration);
      }

      // Don't recalculate end_date here - let DHTMLX handle it
      // Recalculating here can cause DHTMLX to recalculate duration from dates, causing off-by-one errors

      return true;
    });

    // Attach event listeners for task changes
    if (onTaskUpdate) {
      gantt.attachEvent("onAfterTaskAdd", (id: any, task: any) => {
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterTaskUpdate", (id: any, task: any) => {
        // Check if task has successors (tasks that depend on this one)
        const links = gantt.getLinks();
        const hasSuccessors = links.some((link: any) => link.source === id);
        if (hasSuccessors) {
          // Trigger auto-scheduling to update all successor tasks
          gantt.autoSchedule(id);
        }

        // Don't recalculate end_date here - it causes duration to be reduced when only resources are updated
        // End_date recalculation is handled specifically in onAfterInlineEditorSave when duration or start_date changes

        // Refresh the task display
        gantt.render();

        onTaskUpdate();
        return true;
      });

      // Also listen for inline editor save
      gantt.attachEvent("onAfterInlineEditorSave", (state: any) => {
        // If duration was edited, recalculate end_date using DHTMLX's work_time calculation
        if (state.columnName === "duration" && state.id) {
          const task = gantt.getTask(state.id);
          // Store the duration before recalculating end_date
          const originalDuration = task.duration;
          // Use DHTMLX's calculateEndDate which calculates calendar days (including weekends)
          const calculatedEndDate = gantt.calculateEndDate(task.start_date, task.duration);
          task.end_date = calculatedEndDate;
          // Restore the original duration to prevent recalculation
          task.duration = originalDuration;
        }

        // If start_date was edited, recalculate end_date preserving duration
        if (state.columnName === "start_date" && state.id) {
          const task = gantt.getTask(state.id);
          // Store the duration before recalculating end_date
          const originalDuration = task.duration;
          // Use DHTMLX's calculateEndDate which calculates calendar days (including weekends)
          const calculatedEndDate = gantt.calculateEndDate(task.start_date, task.duration);
          task.end_date = calculatedEndDate;
          // Restore the original duration to prevent recalculation
          task.duration = originalDuration;
        }

        // Refresh the Gantt chart to show updated values
        gantt.render();

        // Only call onTaskUpdate once, not after every updateTask
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterTaskDelete", (id: any) => {
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterLinkAdd", (id: any, link: any) => {
        console.log("Link added:", id, link);
        console.log("Triggering auto-schedule from target task:", link.target);
        // Trigger auto-scheduling from the target task when a new link is added
        gantt.autoSchedule(link.target);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterLinkUpdate", (id: any, link: any) => {
        console.log("Link updated:", id, link);
        console.log("Triggering auto-schedule from target task:", link.target);
        // Trigger auto-scheduling when link is updated
        gantt.autoSchedule(link.target);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterLinkDelete", (id: any, link: any) => {
        // Recalculate entire project after link deletion
        gantt.autoSchedule();
        onTaskUpdate();
        return true;
      });

      // Auto-scheduling event handlers
      gantt.attachEvent("onBeforeTaskAutoSchedule", (task: any, start: Date, link: any, predecessor: any) => {
        console.log("=== onBeforeTaskAutoSchedule ===");
        console.log("Task:", task.text);
        console.log("Current start_date:", task.start_date);
        console.log("Current end_date:", task.end_date);
        console.log("Current duration:", task.duration);
        console.log("New start date:", start);
        console.log("Predecessor:", predecessor?.text);

        // Store the original duration to preserve it after auto-scheduling
        task.$original_duration = task.duration;
        task.$original_start_date = task.start_date;
        task.$original_end_date = task.end_date;
        return true;
      });

      gantt.attachEvent("onAfterTaskAutoSchedule", (task: any, start: Date, link: any, predecessor: any) => {
        // Restore the original duration and recalculate end_date to preserve duration
        if (task.$original_duration) {
          const originalDuration = task.$original_duration;

          // Recalculate end_date based on new start_date and original duration
          // Use DHTMLX's calculateEndDate which calculates calendar days (including weekends)
          const calculatedEndDate = gantt.calculateEndDate(task.start_date, originalDuration);

          task.end_date = calculatedEndDate;
          task.duration = originalDuration;

          delete task.$original_duration;
          delete task.$original_start_date;
          delete task.$original_end_date;
        }

        // Trigger update to save the auto-scheduled changes
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterAutoSchedule", (taskId: any, updatedTasks: any[]) => {
        console.log("Auto-scheduling complete. Tasks updated:", updatedTasks?.length || 0);
        if (updatedTasks && updatedTasks.length > 0) {
          console.log("Updated task IDs:", updatedTasks);
          // Re-render baselines after auto-schedule
          setTimeout(() => {
            this.renderBaselines();
          }, 100);
        }
        return true;
      });
    }

    if (this.ganttContainer.current) {
      gantt.init(this.ganttContainer.current);

      // Add baseline layer using dhtmlx gantt's addTaskLayer method
      gantt.addTaskLayer({
        renderer: {
          render: (task: any) => {
            // Skip rendering if task doesn't have valid start_date (new tasks being created)
            if (!task.start_date || !task.id) {
              return false;
            }

            // Use the currently displayed baseline number
            const baselineNum = this.displayedBaselineNum;
            const baselineStartField = `baseline${baselineNum}_startDate`;
            const baselineEndField = `baseline${baselineNum}_endDate`;

            // Check if this task has data for the displayed baseline
            if (!task[baselineStartField] || !task[baselineEndField]) {
              return false;
            }

            // Parse the baseline dates
            const plannedStart = gantt.date.parseDate(task[baselineStartField], "xml_date");
            const plannedEnd = gantt.date.parseDate(task[baselineEndField], "xml_date");

            // Only render baseline if we have valid planned dates
            if (plannedStart && plannedEnd &&
                plannedStart instanceof Date && plannedEnd instanceof Date &&
                !isNaN(plannedStart.getTime()) && !isNaN(plannedEnd.getTime())) {
              try {
                const sizes = gantt.getTaskPosition(task, plannedStart, plannedEnd);

                const el = document.createElement('div');
                el.className = 'baseline';
                el.style.left = sizes.left + 'px';
                el.style.width = sizes.width + 'px';
                el.style.top = (sizes.top + gantt.config.task_height + 13) + 'px';
                el.style.height = '4px';
                el.style.background = '#ef4444';
                el.style.borderRadius = '2px';
                el.style.opacity = '0.9';

                return el;
              } catch (e) {
                // Silently handle any errors in baseline rendering
                console.warn('Error rendering baseline for task:', task.id, e);
                return false;
              }
            }
            return false;
          },
          // Define getRectangle for smart rendering optimization
          getRectangle: (task: any, view: any) => {
            // Skip if task doesn't have valid start_date
            if (!task.start_date || !task.id) {
              return null;
            }

            // Use the currently displayed baseline number
            const baselineNum = this.displayedBaselineNum;
            const baselineStartField = `baseline${baselineNum}_startDate`;
            const baselineEndField = `baseline${baselineNum}_endDate`;

            // Check if this task has data for the displayed baseline
            if (!task[baselineStartField] || !task[baselineEndField]) {
              return null;
            }

            // Parse the baseline dates
            const plannedStart = gantt.date.parseDate(task[baselineStartField], "xml_date");
            const plannedEnd = gantt.date.parseDate(task[baselineEndField], "xml_date");

            if (plannedStart && plannedEnd &&
                plannedStart instanceof Date && plannedEnd instanceof Date &&
                !isNaN(plannedStart.getTime()) && !isNaN(plannedEnd.getTime())) {
              try {
                return gantt.getTaskPosition(task, plannedStart, plannedEnd);
              } catch (e) {
                // Silently handle any errors
                return null;
              }
            }
            return null;
          }
        }
      });

      // Attach event handlers for undo/redo and auto-save
      this.attachEventHandlers();

      // Listen for task selection
      const { onTaskSelect, onTaskMultiSelect } = this.props;
      if (onTaskSelect) {
        gantt.attachEvent("onTaskSelected", (id: number) => {
          onTaskSelect(id);
          return true;
        });

        gantt.attachEvent("onTaskUnselected", (id: number) => {
          onTaskSelect(null);
          return true;
        });
      }

      // Listen for multi-task selection
      if (onTaskMultiSelect) {
        gantt.attachEvent("onTaskMultiselect", (id: number, state: boolean, e: Event) => {
          const selectedTasks = gantt.getSelectedTasks();
          onTaskMultiSelect(selectedTasks);
          return true;
        });
      }

      // Listen for grid resize events to save the user's preference
      gantt.attachEvent("onGridResizeEnd", (old_width: number, new_width: number) => {
        console.log("Grid resized from", old_width, "to", new_width);
        this.saveGridWidthPreference(new_width);
        return true;
      });

      // Listen for zoom level changes to save the user's preference per project
      if (gantt.ext && gantt.ext.zoom) {
        gantt.ext.zoom.attachEvent("onAfterZoom", (level: any, config: any) => {
          console.log("Zoom level changed to:", level);
          this.saveZoomLevelPreference(level);
        });
      }

      // Set up ResizeObserver to handle container resize (but not override user preference)
      this.resizeObserver = new ResizeObserver(() => {
        // Only render, don't change grid_width since user may have set a preference
        gantt.render();
      });
      this.resizeObserver.observe(this.ganttContainer.current);

      console.log("Initializing Gantt with data:", projecttasks);
      console.log("Links in projecttasks:", projecttasks.links);
      console.log("Task types config:", gantt.config.types);
      this.allTasks = projecttasks.data || [];

      // Prepare tasks by removing end_date to let DHTMLX calculate it from start_date + duration
      const preparedTasks = this.prepareTasksForParsing(projecttasks.data || []);

      // Parse data with resources and assignments if available
      if (showResourcePanel && projecttasks.resources) {
        console.log("Loading resources:", projecttasks.resources);
        console.log("Loading resource assignments:", projecttasks.resourceAssignments);

        // First parse the main task data
        gantt.parse({
          data: preparedTasks,
          links: projecttasks.links || []
        });

        // Then load resources into the resource datastore
        const resourceStore = gantt.getDatastore("resource");
        resourceStore.clearAll();
        resourceStore.parse(projecttasks.resources || []);

        // Load resource assignments into the assignments datastore
        const assignmentStore = gantt.getDatastore("resourceAssignments");
        assignmentStore.clearAll();
        assignmentStore.parse(projecttasks.resourceAssignments || []);

        console.log("Resources loaded:", resourceStore.count());
        console.log("Assignments loaded:", assignmentStore.count());
      } else {
        gantt.parse({
          data: preparedTasks,
          links: projecttasks.links || []
        });
      }

      // Restore original durations if they were changed by DHTMLX
      preparedTasks.forEach((preparedTask: any) => {
        if (preparedTask.$group_header) return;

        try {
          const ganttTask = gantt.getTask(preparedTask.id);
          if (ganttTask && ganttTask.duration !== preparedTask.duration) {
            console.log(`Task ${preparedTask.id}: Restoring duration from ${ganttTask.duration} to ${preparedTask.duration}`);
            ganttTask.duration = preparedTask.duration;
            // Recalculate end_date with the correct duration
            ganttTask.end_date = gantt.calculateEndDate(ganttTask.start_date, ganttTask.duration);
            gantt.updateTask(preparedTask.id);
          }
        } catch (e) {
          // Task might not exist yet, skip
        }
      });

      // Sort tasks to ensure proper parent-child hierarchy display
      gantt.sort((a: any, b: any) => {
        // First sort by parent - tasks with no parent (0) come first
        if (a.parent !== b.parent) {
          if (a.parent === 0) return -1;
          if (b.parent === 0) return 1;
          return a.parent - b.parent;
        }
        // Within same parent, sort by ID
        return a.id - b.id;
      });

      // Open all parent tasks to show subtasks
      gantt.eachTask((task: any) => {
        if (gantt.hasChild(task.id)) {
          gantt.open(task.id);
        }
        // Debug: Log milestone tasks and parent relationships
        if (task.type === "milestone" || task.type === gantt.config.types.milestone) {
          console.log("=== MILESTONE FOUND ===");
          console.log("Task ID:", task.id);
          console.log("Task text:", task.text);
          console.log("Task type:", task.type);
          console.log("Task duration:", task.duration);
          console.log("gantt.config.types.milestone:", gantt.config.types.milestone);
          console.log("Type match:", task.type === gantt.config.types.milestone);
          console.log("Full task object:", task);
        }
        if (task.parent) {
          console.log(`Task ${task.id} (${task.text}) has parent: ${task.parent}`);
        }
      });

      // Baseline rendering is now handled automatically by gantt.addTaskLayer
      // No need for manual conversion here - addTaskLayer will convert baseline data on demand

      // Use event delegation to capture add and edit button clicks
      const clickHandler = (e: any) => {
        const target = e.target as HTMLElement;
        console.log("=== Gantt Click Event ===");
        console.log("Click target:", target);
        console.log("Target class:", target.className);
        console.log("Target tag:", target.tagName);

        // Check if click is on edit button or its child elements
        const editButton = target.closest('.gantt_edit_btn');
        console.log("Edit button found:", editButton);
        console.log("onEditTask callback available:", !!onEditTask);

        if (editButton) {
          const taskId = editButton.getAttribute('data-task-id');
          console.log("Task ID from edit button:", taskId);

          if (taskId && onEditTask) {
            console.log("=== CALLING onEditTask with task ID:", taskId, "===");
            onEditTask(parseInt(taskId));
            e.stopPropagation();
            e.preventDefault();
            return;
          } else {
            console.warn("Cannot edit task - taskId:", taskId, "onEditTask:", !!onEditTask);
          }
        } else {
          console.log("Not an edit button click");
        }

        // Check if click is on add button or its child elements
        if (onOpenTaskModal) {
          const addButton = target.closest('.gantt_add');
          if (addButton) {
            console.log("=== Add button clicked (via delegation) ===");
            console.log("Add button element:", addButton);

            // Find the grid row that contains this button
            // Try multiple methods to find the row
            let gridRow = addButton.closest('.gantt_row');
            console.log("Closest .gantt_row:", gridRow);

            if (!gridRow) {
              gridRow = addButton.parentElement?.closest('.gantt_row');
              console.log("Parent closest .gantt_row:", gridRow);
            }

            let parentTaskId: number | undefined = undefined;
            if (gridRow) {
              const taskId = gridRow.getAttribute('task_id');
              console.log("Grid row task_id:", taskId);

              if (taskId) {
                parentTaskId = parseInt(taskId);
                this.pendingParentId = parentTaskId;
                console.log("Set pendingParentId to:", this.pendingParentId);
              }
            } else {
              console.log("Could not find grid row - add button parent chain:");
              let elem = addButton.parentElement;
              let depth = 0;
              while (elem && depth < 10) {
                console.log(`Parent ${depth}:`, elem.className, elem);
                elem = elem.parentElement;
                depth++;
              }
            }

            // Directly open the modal with parent ID
            console.log("Calling onOpenTaskModal directly with parentId:", parentTaskId);
            onOpenTaskModal(parentTaskId);
            e.stopPropagation();
            e.preventDefault();
          }
        }
      };

      // Add listener with capture phase
      this.ganttContainer.current.addEventListener('click', clickHandler, true);

      // Also add listener in bubble phase as backup
      this.ganttContainer.current.addEventListener('click', clickHandler, false);

      console.log("=== Event listeners attached to gantt container ===");
      console.log("Container:", this.ganttContainer.current);
      console.log("onEditTask available at mount:", !!onEditTask);
    }

    // Expose gantt instance globally for access from parent
    (window as any).gantt = gantt;
  }

  componentDidUpdate(prevProps: GanttProps): void {
    const { projecttasks, searchQuery, selectedTaskFields = [], taskCustomFields = [], showResourcePanel } = this.props;
    const prevSelectedFields = prevProps.selectedTaskFields || [];

    // Check if showResourcePanel changed
    if (prevProps.showResourcePanel !== showResourcePanel) {
      console.log("showResourcePanel changed from", prevProps.showResourcePanel, "to", showResourcePanel);

      // Reconfigure resource management
      if (showResourcePanel) {
        gantt.config.resource_store = "resource";
        gantt.config.resource_property = "owner_id";
        gantt.config.process_resource_assignments = true;
        gantt.config.resource_assignment_store = "resourceAssignments";

        // Configure resource grid columns in gantt.config
        gantt.config.columns = gantt.config.columns || [];

        // Store resource columns separately
        const resourceColumns = [
          {
            name: "text",
            label: "Resource Name",
            tree: true,
            width: 200,
            template: function(resource: any) {
              return resource.text || resource.name || "Unnamed Resource";
            }
          },
          {
            name: "workload",
            label: "Workload",
            align: "center",
            width: 100,
            template: function(resource: any) {
              const assignments = gantt.getDatastore("resourceAssignments").getItems().filter((a: any) => a.resource_id === resource.id);
              return assignments.length + " tasks";
            }
          },
          {
            name: "hours",
            label: "Allocated Hours",
            align: "center",
            width: 135,
            template: function(resource: any) {
              return (resource.hours || 0) + " hrs";
            }
          }
        ];

        // Configure layout with resource panel
        gantt.config.layout = {
          css: "gantt_container",
          rows: [
            {
              cols: [
                {
                  width: gantt.config.grid_width || 450,
                  min_width: 300,
                  rows: [
                    {
                      view: "grid",
                      scrollX: "gridScroll",
                      scrollable: true,
                      scrollY: "scrollVer"
                    },
                    {
                      view: "scrollbar",
                      id: "gridScroll",
                      group: "horizontal"
                    }
                  ]
                },
                { resizer: true, width: 1 },
                {
                  rows: [
                    {
                      view: "timeline",
                      scrollX: "scrollHor",
                      scrollY: "scrollVer"
                    },
                    {
                      view: "scrollbar",
                      id: "scrollHor",
                      group: "horizontal"
                    }
                  ]
                },
                { view: "scrollbar", id: "scrollVer" }
              ],
              gravity: 2
            },
            { resizer: true, width: 1 },
            {
              config: { height: 200 },
              cols: [
                {
                  view: "resourceGrid",
                  id: "resourceGrid",
                  group: "grids",
                  width: 450,
                  scrollY: "resourceVScroll",
                  bind: "resource",
                  config: {
                    columns: resourceColumns
                  }
                },
                { resizer: true, width: 1 },
                {
                  view: "resourceTimeline",
                  id: "resourceTimeline",
                  scrollX: "scrollHor",
                  scrollY: "resourceVScroll",
                  bind: "resource"
                },
                { view: "scrollbar", id: "resourceVScroll", group: "vertical" }
              ],
              gravity: 1
            }
          ]
        };
      } else {
        // Configure layout without resource panel
        gantt.config.layout = {
          css: "gantt_container",
          cols: [
            {
              width: gantt.config.grid_width || 450,
              min_width: 300,
              rows: [
                {
                  view: "grid",
                  scrollX: "gridScroll",
                  scrollable: true,
                  scrollY: "scrollVer"
                },
                {
                  view: "scrollbar",
                  id: "gridScroll",
                  group: "horizontal"
                }
              ]
            },
            { resizer: true, width: 1 },
            {
              rows: [
                {
                  view: "timeline",
                  scrollX: "scrollHor",
                  scrollY: "scrollVer"
                },
                {
                  view: "scrollbar",
                  id: "scrollHor",
                  group: "horizontal"
                }
              ]
            },
            { view: "scrollbar", id: "scrollVer" }
          ]
        };
      }

      // Reinitialize gantt with new layout
      if (this.ganttContainer.current) {
        // Clear all existing data and datastores
        gantt.clearAll();

        // Ensure task cells are enabled for proper milestone rendering
        gantt.config.show_task_cells = true;

        // Reinitialize with new layout
        gantt.init(this.ganttContainer.current);

        // Add baseline layer using dhtmlx gantt's addTaskLayer method
        gantt.addTaskLayer({
          renderer: {
            render: (task: any) => {
              // Skip rendering if task doesn't have valid start_date (new tasks being created)
              if (!task.start_date || !task.id) {
                return false;
              }

              // Use the currently displayed baseline number
              const baselineNum = this.displayedBaselineNum;
              const baselineStartField = `baseline${baselineNum}_startDate`;
              const baselineEndField = `baseline${baselineNum}_endDate`;

              // Check if this task has data for the displayed baseline
              if (!task[baselineStartField] || !task[baselineEndField]) {
                return false;
              }

              // Parse the baseline dates
              const plannedStart = gantt.date.parseDate(task[baselineStartField], "xml_date");
              const plannedEnd = gantt.date.parseDate(task[baselineEndField], "xml_date");

              // Only render baseline if we have valid planned dates
              if (plannedStart && plannedEnd &&
                  plannedStart instanceof Date && plannedEnd instanceof Date &&
                  !isNaN(plannedStart.getTime()) && !isNaN(plannedEnd.getTime())) {
                try {
                  const sizes = gantt.getTaskPosition(task, plannedStart, plannedEnd);

                  const el = document.createElement('div');
                  el.className = 'baseline';
                  el.style.left = sizes.left + 'px';
                  el.style.width = sizes.width + 'px';
                  el.style.top = (sizes.top + gantt.config.task_height + 13) + 'px';
                  el.style.height = '4px';
                  el.style.background = '#ef4444';
                  el.style.borderRadius = '2px';
                  el.style.opacity = '0.9';

                  return el;
                } catch (e) {
                  // Silently handle any errors in baseline rendering
                  console.warn('Error rendering baseline for task:', task.id, e);
                  return false;
                }
              }
              return false;
            },
            // Define getRectangle for smart rendering optimization
            getRectangle: (task: any, view: any) => {
              // Skip if task doesn't have valid start_date
              if (!task.start_date || !task.id) {
                return null;
              }

              // Use the currently displayed baseline number
              const baselineNum = this.displayedBaselineNum;
              const baselineStartField = `baseline${baselineNum}_startDate`;
              const baselineEndField = `baseline${baselineNum}_endDate`;

              // Check if this task has data for the displayed baseline
              if (!task[baselineStartField] || !task[baselineEndField]) {
                return null;
              }

              // Parse the baseline dates
              const plannedStart = gantt.date.parseDate(task[baselineStartField], "xml_date");
              const plannedEnd = gantt.date.parseDate(task[baselineEndField], "xml_date");

              if (plannedStart && plannedEnd &&
                  plannedStart instanceof Date && plannedEnd instanceof Date &&
                  !isNaN(plannedStart.getTime()) && !isNaN(plannedEnd.getTime())) {
                try {
                  return gantt.getTaskPosition(task, plannedStart, plannedEnd);
                } catch (e) {
                  // Silently handle any errors
                  return null;
                }
              }
              return null;
            }
          }
        });

        // Prepare tasks by removing end_date
        const preparedTasks = this.prepareTasksForParsing(projecttasks.data || []);

        // Reload data with resources if panel is shown
        if (showResourcePanel && projecttasks.resources) {
          console.log("Reloading with resources:", projecttasks.resources);
          console.log("Reloading with assignments:", projecttasks.resourceAssignments);

          // First parse the main task data
          gantt.parse({
            data: preparedTasks,
            links: projecttasks.links || []
          });

          // Then load resources into the resource datastore
          const resourceStore = gantt.getDatastore("resource");
          resourceStore.clearAll();
          resourceStore.parse(projecttasks.resources || []);

          // Load resource assignments into the assignments datastore
          const assignmentStore = gantt.getDatastore("resourceAssignments");
          assignmentStore.clearAll();
          assignmentStore.parse(projecttasks.resourceAssignments || []);

          console.log("Resources reloaded:", resourceStore.count());
          console.log("Assignments reloaded:", assignmentStore.count());
        } else {
          gantt.parse({
            data: preparedTasks,
            links: projecttasks.links || []
          });
        }

        // Restore original durations if they were changed by DHTMLX
        preparedTasks.forEach((preparedTask: any) => {
          if (preparedTask.$group_header) return;

          try {
            const ganttTask = gantt.getTask(preparedTask.id);
            if (ganttTask && ganttTask.duration !== preparedTask.duration) {
              console.log(`Task ${preparedTask.id}: Restoring duration from ${ganttTask.duration} to ${preparedTask.duration}`);
              ganttTask.duration = preparedTask.duration;
              ganttTask.end_date = gantt.calculateEndDate(ganttTask.start_date, ganttTask.duration);
              gantt.updateTask(preparedTask.id);
            }
          } catch (e) {
            // Task might not exist yet, skip
          }
        });

        // Baseline rendering is now handled automatically by gantt.addTaskLayer
        gantt.render();
      }

      return; // Exit early to avoid double render
    }

    // Check if selected task fields changed
    const fieldsChanged =
      selectedTaskFields.length !== prevSelectedFields.length ||
      selectedTaskFields.some((fieldId, index) => fieldId !== prevSelectedFields[index]);

    if (fieldsChanged) {
      // Rebuild columns
      this.buildGanttColumns();

      // Initialize empty values for newly added fields in all tasks
      const newFieldIds = selectedTaskFields.filter(id => !prevSelectedFields.includes(id));
      if (newFieldIds.length > 0 && projecttasks.data.length > 0) {
        const tasksNeedUpdate = projecttasks.data.filter(task => !task.$group_header);

        tasksNeedUpdate.forEach((task: any) => {
          newFieldIds.forEach(fieldId => {
            const field = taskCustomFields.find(f => f.id === fieldId);
            if (field) {
              const fieldKey = `custom_${field.field_name}`;
              // Only initialize if the field doesn't already have a value
              if (task[fieldKey] === undefined || task[fieldKey] === null) {
                task[fieldKey] = field.default_value || '';
              }
            }
          });

          // Update the task in gantt
          if (gantt.isTaskExists(task.id)) {
            gantt.updateTask(task.id);
          }
        });

        // Trigger a save to persist the changes
        if (this.props.onTaskUpdate) {
          this.props.onTaskUpdate();
        }
      }

      // Force gantt to re-render
      gantt.render();
    }

    // Optimized comparison - check data length and reference instead of deep JSON comparison
    const dataChanged = prevProps.projecttasks.data !== projecttasks.data ||
                       prevProps.projecttasks.data?.length !== projecttasks.data?.length ||
                       prevProps.projecttasks.links !== projecttasks.links;

    // Skip re-parsing data if undo/redo is in progress to preserve the undo/redo stack
    if (dataChanged) {
      if (this.isUndoRedoInProgress) {
        console.log("Skipping data re-parse - undo/redo in progress");
        return;
      }

      this.allTasks = projecttasks.data || [];
      console.log("=== Gantt parsing tasks ===", projecttasks.data?.length || 0, "tasks");

    
      // Log sample task with duration for debugging
      if (projecttasks.data && projecttasks.data.length > 0) {
        console.log("Sample task before preparation:", {
          id: projecttasks.data[0].id,
          text: projecttasks.data[0].text,
          duration: projecttasks.data[0].duration,
          duration_type: typeof projecttasks.data[0].duration,
          start_date: projecttasks.data[0].start_date,
          end_date: projecttasks.data[0].end_date
        });
      }

      // Save current scroll position before clearing
      const scrollState = gantt.getScrollState();

      // Reset grouping state when data changes
      this.isGrouped = false;
      this.originalTasks = [];
      this.originalLinks = [];
      gantt.clearAll();

      // Prepare tasks by removing end_date
      const preparedTasks = this.prepareTasksForParsing(projecttasks.data || []);

      // Log prepared task for debugging
      if (preparedTasks.length > 0) {
        console.log("Sample task after preparation:", {
          id: preparedTasks[0].id,
          text: preparedTasks[0].text,
          duration: preparedTasks[0].duration,
          duration_type: typeof preparedTasks[0].duration,
          start_date: preparedTasks[0].start_date,
          end_date: preparedTasks[0].end_date
        });
      }

      // Use requestAnimationFrame to allow UI to update
      requestAnimationFrame(() => {
        try {
          console.log("=== Before gantt.parse() ===");
          if (preparedTasks.length > 0) {
            console.log("First task before parse:", {
              id: preparedTasks[0].id,
              duration: preparedTasks[0].duration,
              start_date: preparedTasks[0].start_date,
              end_date: preparedTasks[0].end_date
            });
          }

          gantt.parse({
            data: preparedTasks,
            links: projecttasks.links || []
          });

          console.log("=== After gantt.parse() ===");
          const firstTask = gantt.getTask(preparedTasks[0]?.id);
          if (firstTask) {
            console.log("First task after parse:", {
              id: firstTask.id,
              duration: firstTask.duration,
              start_date: firstTask.start_date,
              end_date: firstTask.end_date
            });
          }

          // Restore original durations if they were changed by DHTMLX
          preparedTasks.forEach((preparedTask: any) => {
            if (preparedTask.$group_header) return;

            try {
              const ganttTask = gantt.getTask(preparedTask.id);
              if (ganttTask && ganttTask.duration !== preparedTask.duration) {
                console.log(`Task ${preparedTask.id}: Restoring duration from ${ganttTask.duration} to ${preparedTask.duration}`);
                ganttTask.duration = preparedTask.duration;
                // Recalculate end_date with the correct duration
                ganttTask.end_date = gantt.calculateEndDate(ganttTask.start_date, ganttTask.duration);
                gantt.updateTask(preparedTask.id);
              }
            } catch (e) {
              // Task might not exist yet, skip
            }
          });

          // Sort tasks to ensure proper parent-child hierarchy display
          gantt.sort((a: any, b: any) => {
            // First sort by parent - tasks with no parent (0) come first
            if (a.parent !== b.parent) {
              if (a.parent === 0) return -1;
              if (b.parent === 0) return 1;
              return a.parent - b.parent;
            }
            // Within same parent, sort by ID
            return a.id - b.id;
          });

          // Open all parent tasks to show subtasks
          gantt.eachTask((task: any) => {
            if (gantt.hasChild(task.id)) {
              gantt.open(task.id);
            }
          });

          // Baseline rendering is now handled automatically by gantt.addTaskLayer

          // Restore scroll position after parsing and rendering
          if (scrollState) {
            setTimeout(() => {
              try {
                gantt.scrollTo(scrollState.x, scrollState.y);
              } catch (e) {
                console.warn('Could not restore scroll position:', e);
              }
            }, 100);
          }

          gantt.render();
        } catch (error) {
          console.error('Error parsing Gantt data:', error);
          // Try to recover by clearing and re-initializing
          gantt.clearAll();
          if (this.ganttContainer.current) {
            // Ensure task cells are enabled for proper milestone rendering
            gantt.config.show_task_cells = true;
            gantt.init(this.ganttContainer.current);
          }
        }
      });
    }

    if (prevProps.searchQuery !== searchQuery) {
      this.filterTasks(searchQuery || '');
    }
  }

  private filterTasks(query: string): void {
    const { projecttasks } = this.props;

    // Save scroll position
    const scrollState = gantt.getScrollState();

    // If no search query, restore to either grouped or ungrouped view
    if (!query.trim()) {
      if (this.isGrouped) {
        // Restore grouped view
        gantt.clearAll();
        gantt.parse({
          data: this.originalTasks,
          links: this.originalLinks
        });
        // Re-apply grouping
        this.isGrouped = false; // Reset flag
        this.toggleGroupByOwner(); // Re-group
      } else {
        // Restore ungrouped view
        gantt.clearAll();
        const preparedTasks = this.prepareTasksForParsing(projecttasks.data || []);
        gantt.parse({
          data: preparedTasks,
          links: projecttasks.links || []
        });
      }

      // Restore scroll position
      if (scrollState) {
        setTimeout(() => {
          try {
            gantt.scrollTo(scrollState.x, scrollState.y);
          } catch (e) {
            console.warn('Could not restore scroll position:', e);
          }
        }, 50);
      }
      return;
    }

    const lowerQuery = query.toLowerCase();

    // If grouped, search within the current grouped view
    if (this.isGrouped) {
      // Get all current tasks (including group headers)
      const currentTasks: any[] = [];
      gantt.eachTask((task: any) => {
        currentTasks.push(task);
      });

      // Filter tasks but keep group headers if they have matching children
      const groupHeadersWithMatches = new Set<number>();
      const matchingTasks = currentTasks.filter((task: any) => {
        if (task.$group_header) {
          return false; // We'll add these back later if needed
        }
        const matches = task.text.toLowerCase().includes(lowerQuery);
        if (matches && task.parent) {
          groupHeadersWithMatches.add(task.parent);
        }
        return matches;
      });

      // Add group headers that have matching tasks
      const filteredData = [
        ...currentTasks.filter((task: any) =>
          task.$group_header && groupHeadersWithMatches.has(task.id)
        ),
        ...matchingTasks
      ];

      gantt.clearAll();
      // Prepare tasks by removing end_date to recalculate
      const preparedTasks = this.prepareTasksForParsing(filteredData);
      gantt.parse({
        data: preparedTasks,
        links: []
      });
    } else {
      // Regular ungrouped filtering
      const filteredData = this.allTasks.filter((task: Task) =>
        task.text.toLowerCase().includes(lowerQuery)
      );

      const filteredLinks = (projecttasks.links || []).filter((link: Link) => {
        const sourceExists = filteredData.some(t => t.id === link.source);
        const targetExists = filteredData.some(t => t.id === link.target);
        return sourceExists && targetExists;
      });

      gantt.clearAll();
      // Prepare tasks by removing end_date to recalculate
      const preparedTasks = this.prepareTasksForParsing(filteredData);
      gantt.parse({
        data: preparedTasks,
        links: filteredLinks
      });
    }

    // Restore scroll position after filtering
    if (scrollState) {
      setTimeout(() => {
        try {
          gantt.scrollTo(scrollState.x, scrollState.y);
        } catch (e) {
          console.warn('Could not restore scroll position:', e);
        }
      }, 50);
    }
  }

  componentWillUnmount(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Clear all data before cleanup
    try {
      gantt.clearAll();
    } catch (e) {
      console.warn('Error clearing gantt:', e);
    }
  }

  private updateWorkTimeConfig(skipWeekends: boolean) {
    if (skipWeekends) {
      // Enable work time to exclude weekends from duration
      gantt.config.work_time = true;
      gantt.setWorkTime({ hours: [8, 17] }); // Default working hours
      gantt.setWorkTime({ day: 0, hours: false }); // Sunday
      gantt.setWorkTime({ day: 6, hours: false }); // Saturday
      console.log("Weekend skipping enabled: Duration excludes Sat/Sun");
    } else {
      // Disable work time to include weekends in duration
      gantt.config.work_time = false;
      console.log("Weekend skipping disabled: Duration includes all days");
    }
  }

  /**
   * Remove end_date from tasks to prevent DHTMLX from prioritizing it over duration.
   * DHTMLX will calculate end_date automatically based on start_date + duration.
   * This fixes the bug where old end_date from database causes incorrect duration recalculation.
   */
  private prepareTasksForParsing(tasks: any[]): any[] {
    return tasks.map(task => {
      const { end_date, ...taskWithoutEndDate } = task;

      // Ensure duration is a valid number
      if (taskWithoutEndDate.duration !== undefined && taskWithoutEndDate.duration !== null) {
        // Convert to number if it's a string
        if (typeof taskWithoutEndDate.duration === 'string') {
          taskWithoutEndDate.duration = parseFloat(taskWithoutEndDate.duration);
        }
        // Ensure it's a valid number, default to 1 if not
        if (isNaN(taskWithoutEndDate.duration) || taskWithoutEndDate.duration < 1) {
          taskWithoutEndDate.duration = 1;
        }
      } else if (!taskWithoutEndDate.$group_header) {
        // Set default duration for non-group tasks
        taskWithoutEndDate.duration = 1;
      }

      return taskWithoutEndDate;
    });
  }

  attachEventHandlers(): void {
    const { onTaskUpdate } = this.props;

    if (!onTaskUpdate) return;

    // Only attach once to prevent duplicate handlers
    if (this.eventHandlersAttached) {
      console.log('Event handlers already attached, skipping');
      return;
    }

    console.log('Attaching Gantt event handlers');

    // After any task is added, updated, or deleted
    gantt.attachEvent("onAfterTaskAdd", () => {
      if (!this.isUndoRedoInProgress) {
        onTaskUpdate();
      }
    });
    gantt.attachEvent("onAfterTaskUpdate", () => {
      if (!this.isUndoRedoInProgress) {
        onTaskUpdate();
      }
    });
    gantt.attachEvent("onAfterTaskDelete", () => {
      if (!this.isUndoRedoInProgress) {
        onTaskUpdate();
      }
    });

    // After any link is added or deleted
    gantt.attachEvent("onAfterLinkAdd", () => {
      if (!this.isUndoRedoInProgress) {
        onTaskUpdate();
      }
    });
    gantt.attachEvent("onAfterLinkDelete", () => {
      if (!this.isUndoRedoInProgress) {
        onTaskUpdate();
      }
    });

    // Listen for undo/redo actions to prevent auto-save during these operations
    gantt.attachEvent("onBeforeUndo", () => {
      console.log('onBeforeUndo triggered');
      this.isUndoRedoInProgress = true;
      return true;
    });

    gantt.attachEvent("onAfterUndo", () => {
      console.log('onAfterUndo triggered');
      // Save immediately with skipRefresh flag
      if (onTaskUpdate) {
        onTaskUpdate(true);
      }
      // Re-render baselines after undo
      setTimeout(() => {
        this.renderBaselines();
      }, 100);
      // Keep flag active longer to prevent re-parsing during save
      setTimeout(() => {
        console.log('Resetting isUndoRedoInProgress flag after undo');
        this.isUndoRedoInProgress = false;
      }, 500);
      return true;
    });

    gantt.attachEvent("onBeforeRedo", () => {
      console.log('onBeforeRedo triggered');
      this.isUndoRedoInProgress = true;
      return true;
    });

    gantt.attachEvent("onAfterRedo", () => {
      console.log('onAfterRedo triggered');
      // Save immediately with skipRefresh flag
      if (onTaskUpdate) {
        onTaskUpdate(true);
      }
      // Re-render baselines after redo
      setTimeout(() => {
        this.renderBaselines();
      }, 100);
      // Keep flag active longer to prevent re-parsing during save
      setTimeout(() => {
        console.log('Resetting isUndoRedoInProgress flag after redo');
        this.isUndoRedoInProgress = false;
      }, 500);
      return true;
    });

    this.eventHandlersAttached = true;
    console.log('Event handlers attached successfully');
  }

  render(): React.ReactNode {
    return (
      <div
        ref={this.ganttContainer}
        className="gantt-container"
        style={{ width: "100%", height: "100%" }}
      ></div>
    );
  }
}
