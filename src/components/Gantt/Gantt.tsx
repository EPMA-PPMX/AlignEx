import React, { Component, createRef } from "react";
import { gantt } from "../../lib/dhtmlxgantt/gantt-wrapper";
import "../../lib/dhtmlxgantt/dhtmlxgantt.css";
import "./Gantt.css";

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
  searchQuery?: string;
  selectedTaskFields?: string[];
  taskCustomFields?: CustomField[];
  showResourcePanel?: boolean;
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();
  private pendingParentId: number | undefined = undefined;
  private allTasks: Task[] = [];
  private isGrouped: boolean = false;
  private originalTasks: any[] = [];
  private originalLinks: any[] = [];
  private groupHeaderIdStart: number = 999900;
  private resizeObserver: ResizeObserver | null = null;

  public isGroupedByOwner = (): boolean => {
    return this.isGrouped;
  };

  public getGanttInstance = () => {
    return gantt;
  };

  public setBaseline = (baselineNum: number = 0): any[] => {
    const baselineData: any[] = [];

    gantt.eachTask((task: any) => {
      // Skip group headers
      if (task.$group_header) return;

      // Get current start and end dates
      const startDate = gantt.date.parseDate(task.start_date, "xml_date");
      const endDate = gantt.calculateEndDate({
        start_date: startDate,
        duration: task.duration
      });

      // Format dates as YYYY-MM-DD HH:mm for storage
      const dateTimeFormat = gantt.date.date_to_str("%Y-%m-%d %H:%i");
      const startDateStr = dateTimeFormat(startDate);
      const endDateStr = dateTimeFormat(endDate);

      // Store baseline fields directly in task data with the naming convention: baseline{N}_StartDate and baseline{N}_EndDate
      task[`baseline${baselineNum}_StartDate`] = startDateStr;
      task[`baseline${baselineNum}_EndDate`] = endDateStr;

      // Also store as Date objects for rendering baseline bars
      task[`planned_start_${baselineNum}`] = startDate;
      task[`planned_end_${baselineNum}`] = endDate;

      // Keep the default planned_start/planned_end for backward compatibility with baseline 0
      if (baselineNum === 0) {
        task.planned_start = startDate;
        task.planned_end = endDate;
      }

      // Store baseline data for return (for logging purposes)
      baselineData.push({
        task_id: task.id,
        baseline_number: baselineNum,
        [`baseline${baselineNum}_StartDate`]: startDateStr,
        [`baseline${baselineNum}_EndDate`]: endDateStr
      });

      // Update the task in gantt
      gantt.updateTask(task.id);
    });

    console.log(`Setting baseline ${baselineNum} with fields: baseline${baselineNum}_StartDate, baseline${baselineNum}_EndDate`);
    console.log('Baseline data:', baselineData);
    gantt.render();

    // Manually trigger baseline rendering
    setTimeout(() => {
      this.renderBaselines();
    }, 100);

    return baselineData;
  };

  public zoomIn = (): void => {
    gantt.ext.zoom.zoomIn();
  };

  public zoomOut = (): void => {
    gantt.ext.zoom.zoomOut();
  };

  public toggleGroupByOwner = (): void => {
    if (this.isGrouped) {
      // Remove grouping - restore original tasks
      console.log('Ungrouping: restoring original tasks', this.originalTasks);
      console.log('Ungrouping: restoring original links', this.originalLinks);
      gantt.clearAll();
      gantt.parse({
        data: this.originalTasks,
        links: this.originalLinks
      });
      this.isGrouped = false;
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
      gantt.parse({
        data: newTasks,
        links: []
      });

      this.isGrouped = true;
    }
  };

  private renderBaselines = (): void => {
    console.log("=== Rendering Baselines ===");

    // Remove existing baseline elements
    const existingBaselines = document.querySelectorAll('.baseline-bar');
    console.log("Removing existing baselines:", existingBaselines.length);
    existingBaselines.forEach(el => el.remove());

    let baselineCount = 0;

    // Render baseline for each task that has planned dates
    gantt.eachTask((task: any) => {
      console.log(`Task ${task.id}: planned_start=${task.planned_start}, planned_end=${task.planned_end}`);

      if (task.planned_start && task.planned_end && !task.$group_header) {
        try {
          const sizes = gantt.getTaskPosition(task, task.planned_start, task.planned_end);
          const actualTaskSizes = gantt.getTaskPosition(task, task.start_date, task.end_date);

          console.log(`Task ${task.id} - baseline sizes:`, sizes);
          console.log(`Task ${task.id} - actual task sizes:`, actualTaskSizes);
          console.log(`Task ${task.id} - row_height: ${gantt.config.row_height}, task_height: ${gantt.config.task_height}`);

          const el = document.createElement('div');
          el.className = 'baseline-bar';
          el.style.position = 'absolute';
          el.style.left = sizes.left + 'px';
          el.style.width = sizes.width + 'px';

          // Use the actual task's top position and add actual task height to place baseline below
          // sizes.top is the top of the row, task bar is centered in the row
          // sizes.height is the actual height of the rendered task bar
          const rowTop = actualTaskSizes.top;
          const rowHeight = actualTaskSizes.rowHeight;
          const taskBarHeight = actualTaskSizes.height;
          const taskBarVerticalOffset = (rowHeight - taskBarHeight) / 2;
          const taskBarTop = rowTop + taskBarVerticalOffset;
          const taskBarBottom = taskBarTop + taskBarHeight;
          const baselineTop = taskBarBottom + 25;

          console.log(`Task ${task.id} - calculated: rowTop=${rowTop}, taskBarTop=${taskBarTop}, taskBarBottom=${taskBarBottom}, baselineTop=${baselineTop}`);

          el.style.top = baselineTop + 'px';
          el.style.height = '6px';
          el.style.background = '#ec4899';
          el.style.border = '1px solid #db2777';
          el.style.opacity = '0.8';
          el.style.borderRadius = '3px';
          el.style.pointerEvents = 'none';
          el.style.zIndex = '1';

          // Find the timeline area and append
          const timelineArea = document.querySelector('.gantt_task');
          console.log("Timeline area found:", !!timelineArea);

          if (timelineArea) {
            timelineArea.appendChild(el);
            baselineCount++;
            console.log(`Baseline rendered for task ${task.id} at top: ${baselineTop}px`);
          } else {
            console.warn("Timeline area not found for baseline rendering");
          }
        } catch (e) {
          console.error('Error rendering baseline for task', task.id, e);
        }
      }
    });

    console.log(`Total baselines rendered: ${baselineCount}`);
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
            const badges = owners.map((name: string, index: number) => {
              const initial = name.charAt(0).toUpperCase();
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              const color = colors[index % colors.length];
              return `<span class="owner-badge" style="background-color: ${color};" title="${name}">${initial}</span>`;
            }).join('');

            return `<div class="owner-badges-container">${badges}</div>`;
          }

          // Handle owner_name as string (legacy single-owner tasks)
          return task.owner_name || "Unassigned";
        }
      },
      { name: "start_date", label: "Start time", align: "center", width: 120, resize: true, editor: dateEditor },
      {
        name: "end_date",
        label: "End time",
        align: "center",
        width: 120,
        resize: true,
        template: (task: any) => {
          if (task.$group_header) return "";
          return gantt.templates.date_grid(task.end_date, task);
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

  componentDidMount(): void {
    if (!this.ganttContainer.current) return;

    gantt.license = "39548339";

    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.readonly = false;
    gantt.config.details_on_dblclick = true;

    // Enable plugins
    gantt.plugins({
      keyboard_navigation: true,
      auto_scheduling: true, // Enable auto-scheduling for automatic task rescheduling based on dependencies
      inline_editors: true
    });
    gantt.config.keyboard_navigation_cells = true;

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
            { unit: "day", step: 1, format: "%d %M" }
          ]
        },
        {
          name: "week",
          scale_height: 50,
          min_column_width: 50,
          scales: [
            { unit: "week", step: 1, format: function (date: Date) {
                const dateToStr = gantt.date.date_to_str("%d %M");
                const endDate = gantt.date.add(date, -6, "day");
                const weekNum = gantt.date.date_to_str("%W")(date);
                return "#" + weekNum + ", " + dateToStr(date) + " - " + dateToStr(endDate);
              }
            },
            { unit: "day", step: 1, format: "%j %D" }
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
                const dateToStr = gantt.date.date_to_str("%M");
                const endDate = gantt.date.add(gantt.date.add(date, 3, "month"), -1, "day");
                return dateToStr(date) + " - " + dateToStr(endDate);
              }
            },
            { unit: "month", step: 1, format: "%M" }
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
      gantt.ext.zoom.setLevel("day");
    }

    // Set grid width to 40% of container (task pane), leaving 60% for chart
    const updateGridWidth = () => {
      if (this.ganttContainer.current) {
        const containerWidth = this.ganttContainer.current.offsetWidth;
        gantt.config.grid_width = Math.floor(containerWidth * 0.4);
      }
    };

    updateGridWidth();
    gantt.config.min_grid_column_width = 50;

    // Disable work time to use calendar days for duration (not working days)
    gantt.config.skip_off_time = false;
    gantt.config.work_time = false;

    // Explicitly configure duration settings to prevent calculation issues
    gantt.config.duration_unit = "day";
    gantt.config.duration_step = 1;
    gantt.config.correct_work_time = false;
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
        return isNaN(num) ? 1 : Math.max(1, Math.round(num));
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
                width: 400,
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
            width: 400,
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

    // Hide milestone text on the chart - name only appears in grid
    gantt.templates.rightside_text = function(start: any, end: any, task: any) {
      return "";
    };

    // Hide text inside milestone diamond
    gantt.templates.task_text = function(start: any, end: any, task: any) {
      if (task.type === gantt.config.types.milestone) {
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

    // Validate and normalize duration before task is updated
    // Let DHTMLX Gantt handle date calculations to avoid conflicts with auto-scheduling
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
        console.log(`Task ${id} duration set to: ${task.duration}`);
      }

      // Don't manually recalculate end_date - let DHTMLX Gantt handle it
      // This prevents conflicts with auto-scheduling which manages dates automatically
      return true;
    });

    // Attach event listeners for task changes
    if (onTaskUpdate) {
      gantt.attachEvent("onAfterTaskAdd", (id: any, task: any) => {
        console.log("Task added:", id, task);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterTaskUpdate", (id: any, task: any) => {
        console.log("=== onAfterTaskUpdate ===");
        console.log("Task ID:", id);
        console.log("Task:", task.text);
        console.log("start_date:", task.start_date);
        console.log("end_date:", task.end_date);
        console.log("duration:", task.duration);

        // Check if task has successors (tasks that depend on this one)
        const links = gantt.getLinks();
        const hasSuccessors = links.some((link: any) => link.source === id);
        if (hasSuccessors) {
          console.log("Task has successors, triggering auto-schedule");
          // Trigger auto-scheduling to update all successor tasks
          gantt.autoSchedule(id);
        }
        onTaskUpdate();
        return true;
      });

      // Also listen for inline editor save
      gantt.attachEvent("onAfterInlineEditorSave", (state: any) => {
        console.log("Inline editor saved:", state);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterTaskDelete", (id: any) => {
        console.log("Task deleted:", id);
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
        console.log("Link deleted:", id);
        console.log("Triggering auto-schedule after link deletion");
        // Recalculate entire project after link deletion
        gantt.autoSchedule();
        onTaskUpdate();
        return true;
      });

      // Auto-scheduling event handlers
      gantt.attachEvent("onBeforeTaskAutoSchedule", (task: any, start: Date, link: any, predecessor: any) => {
        console.log("=== onBeforeTaskAutoSchedule ===");
        console.log("Task:", task.text);
        console.log("Task ID:", task.id);
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
        console.log("=== onAfterTaskAutoSchedule ===");
        console.log("Task:", task.text);
        console.log("Task ID:", task.id);
        console.log("Original start_date:", task.$original_start_date);
        console.log("Original end_date:", task.$original_end_date);
        console.log("Original duration:", task.$original_duration);
        console.log("After auto-schedule start_date:", task.start_date);
        console.log("After auto-schedule end_date:", task.end_date);
        console.log("After auto-schedule duration:", task.duration);

        // Calculate what the duration should be from the dates
        const calculatedDuration = gantt.calculateDuration(task.start_date, task.end_date);
        console.log("DHTMLX calculated duration from dates:", calculatedDuration);

        // Restore the original duration and recalculate end_date to preserve duration
        if (task.$original_duration) {
          const originalDuration = task.$original_duration;
          console.log("Restoring original duration:", originalDuration);

          // Recalculate end_date based on new start_date and original duration
          const endDate = gantt.calculateEndDate({
            start_date: task.start_date,
            duration: originalDuration,
            task: task
          });

          task.duration = originalDuration;
          task.end_date = endDate;

          console.log("After restoration:");
          console.log("  duration:", task.duration);
          console.log("  end_date:", task.end_date);

          // Verify the duration is correct
          const verifyDuration = gantt.calculateDuration(task.start_date, task.end_date);
          console.log("  Verification - calculated duration:", verifyDuration);

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
        }
        return true;
      });
    }

    if (this.ganttContainer.current) {
      gantt.init(this.ganttContainer.current);

      // Set up ResizeObserver to update grid width on container resize
      this.resizeObserver = new ResizeObserver(() => {
        if (this.ganttContainer.current) {
          const containerWidth = this.ganttContainer.current.offsetWidth;
          gantt.config.grid_width = Math.floor(containerWidth * 0.4);
          gantt.render();
        }
      });
      this.resizeObserver.observe(this.ganttContainer.current);

      // Add baseline rendering after gantt renders
      gantt.attachEvent("onGanttRender", () => {
        this.renderBaselines();
      });

      console.log("Initializing Gantt with data:", projecttasks);
      console.log("Links in projecttasks:", projecttasks.links);
      console.log("Task types config:", gantt.config.types);
      this.allTasks = projecttasks.data || [];

      // Parse data with resources and assignments if available
      if (showResourcePanel && projecttasks.resources) {
        console.log("Loading resources:", projecttasks.resources);
        console.log("Loading resource assignments:", projecttasks.resourceAssignments);

        // First parse the main task data
        gantt.parse({
          data: projecttasks.data,
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
        gantt.parse(projecttasks);
      }

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
          console.log("Milestone task found:", task);
        }
        if (task.parent) {
          console.log(`Task ${task.id} (${task.text}) has parent: ${task.parent}`);
        }
      });

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
                  width: 400,
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
              width: 400,
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

        // Reinitialize with new layout
        gantt.init(this.ganttContainer.current);

        // Reload data with resources if panel is shown
        if (showResourcePanel && projecttasks.resources) {
          console.log("Reloading with resources:", projecttasks.resources);
          console.log("Reloading with assignments:", projecttasks.resourceAssignments);

          // First parse the main task data
          gantt.parse({
            data: projecttasks.data,
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
          gantt.parse(projecttasks);
        }

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

    if (JSON.stringify(prevProps.projecttasks) !== JSON.stringify(projecttasks)) {
      this.allTasks = projecttasks.data || [];
      console.log("=== Gantt parsing tasks ===");
      console.log("Tasks data:", projecttasks.data);
      console.log("Milestone tasks:", projecttasks.data?.filter((t: any) => t.type === 'milestone'));

      // Reset grouping state when data changes
      this.isGrouped = false;
      this.originalTasks = [];
      this.originalLinks = [];
      gantt.clearAll();
      gantt.parse(projecttasks);

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

      // Load baseline data if available and apply to tasks
      if (projecttasks.baseline && projecttasks.baseline.length > 0) {
        console.log("Loading baseline data:", projecttasks.baseline);

        // Create a map of baseline data by task_id
        const baselineMap: { [key: number]: any } = {};
        projecttasks.baseline.forEach((baseline: any) => {
          baselineMap[baseline.task_id] = baseline;
        });

        // Apply baseline data to each task
        gantt.eachTask((task: any) => {
          const baseline = baselineMap[task.id];
          if (baseline) {
            task.planned_start = gantt.date.parseDate(baseline.planned_start, "xml_date");
            task.planned_end = gantt.date.parseDate(baseline.planned_end, "xml_date");
            console.log(`Applied baseline to task ${task.id}:`, task.planned_start, task.planned_end);
          }
        });

        gantt.render();
      }
    }

    if (prevProps.searchQuery !== searchQuery) {
      this.filterTasks(searchQuery || '');
    }
  }

  private filterTasks(query: string): void {
    const { projecttasks } = this.props;

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
        gantt.parse(projecttasks);
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
      gantt.parse({
        data: filteredData,
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
      gantt.parse({
        data: filteredData,
        links: filteredLinks
      });
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
