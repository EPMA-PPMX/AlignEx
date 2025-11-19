import React, { Component, createRef } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import "./Gantt.css";

// Define TypeScript interfaces for props and tasks
interface Task {
  id: number;
  text: string;
  start_date: string;
  duration: number;
  progress?: number;
  parent?: number; 
}

interface Link {
  id: number;
  source: number;
  target: number;
  type: string;
}

interface GanttProps {
  projecttasks: {
    data: Task[];
    links?: Link[];
  };
  onTaskUpdate?: () => void;
  onOpenTaskModal?: (parentId?: number) => void;
  onEditTask?: (taskId: number) => void;
  searchQuery?: string;
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();
  private pendingParentId: number | undefined = undefined;
  private allTasks: Task[] = [];
  private isGrouped: boolean = false;
  private originalTasks: any[] = [];
  private originalLinks: any[] = [];
  private groupHeaderIdStart: number = 999900;

  public isGroupedByOwner = (): boolean => {
    return this.isGrouped;
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

  componentDidMount(): void {
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.readonly = false;
    gantt.config.details_on_dblclick = true;

    // Enable keyboard navigation plugin for inline editing
    gantt.plugins({
      keyboard_navigation: true
    });
    gantt.config.keyboard_navigation_cells = true;

    // Enable column resizing - must be set before columns configuration
    gantt.config.grid_resize = true;
    gantt.config.keep_grid_width = false;

    // Enable autosize to fit all tasks without scrolling
    gantt.config.autosize = "xy";
    gantt.config.autosize_min_width = 800;

    // Configure to skip weekends
    gantt.config.skip_off_time = true;
    gantt.config.work_time = true;

    // Set weekend days (0 = Sunday, 6 = Saturday)
    gantt.setWorkTime({ day: 0, hours: false });
    gantt.setWorkTime({ day: 6, hours: false });

    const { projecttasks, onTaskUpdate, onOpenTaskModal, onEditTask } = this.props;

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
      max: 365
    };

    // Configure layout with horizontal scroll for grid
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

    // Enable auto types for WBS
    gantt.config.auto_types = true;

    // Custom add button column with resizable columns and inline editors
    gantt.config.columns = [
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

          // Check if task has resource_ids array (multiple resources)
          if (task.resource_ids && Array.isArray(task.resource_ids) && task.resource_ids.length > 0) {
            const owners = task.resource_names || [];
            if (owners.length === 0) return "Unassigned";

            // Create owner badges
            const badges = owners.map((name: string, index: number) => {
              const initial = name.charAt(0).toUpperCase();
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
              const color = colors[index % colors.length];
              return `<span class="owner-badge" style="background-color: ${color};" title="${name}">${initial}</span>`;
            }).join('');

            return `<div class="owner-badges-container">${badges}</div>`;
          }

          // Fallback to single owner_name for backward compatibility
          return task.owner_name || "Unassigned";
        }
      },
      { name: "start_date", label: "Start time", align: "center", width: 80, resize: true, editor: dateEditor },
      { name: "duration", label: "Duration", align: "center", width: 70, resize: true, editor: durationEditor },
      { name: "add", label: "", width: 44 }
    ];

    // Custom styling for group headers
    gantt.templates.task_class = (start: any, end: any, task: any) => {
      if (task.$group_header) {
        return "group-header-task";
      }
      return "";
    };

    gantt.templates.grid_row_class = (start: any, end: any, task: any) => {
      if (task.$group_header) {
        return "group-header-row";
      }
      return "";
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

      // Listen for when a task is created (when Add button is clicked)
      gantt.attachEvent("onTaskCreated", (task: any) => {
        console.log("=== onTaskCreated Event ===");
        console.log("Task object:", task);
        console.log("task.parent:", task.parent);
        console.log("task.$rendered_parent:", task.$rendered_parent);
        console.log("task.$local_index:", task.$local_index);
        console.log("task.$index:", task.$index);

        // Capture the parent - check various parent properties
        const parentId = task.$rendered_parent || task.parent;
        // 0 means root level, so treat it as undefined
        this.pendingParentId = (parentId && parentId !== 0) ? parentId : undefined;
        console.log("Captured parent ID:", this.pendingParentId);
        return true;
      });
    }

    // Handle double-click on task to edit using onTaskDblClick
    gantt.attachEvent("onTaskDblClick", (id: any, e: any) => {
      console.log("onTaskDblClick triggered for task ID:", id);
      console.log("onEditTask callback exists:", !!onEditTask);

      try {
        // Check if task exists
        if (!gantt.isTaskExists(id)) {
          console.log("Task does not exist");
          if (onOpenTaskModal) onOpenTaskModal();
          return false;
        }

        // Get the task data
        const task = gantt.getTask(id);
        console.log("Task data:", task);

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
          console.log("Calling onEditTask with ID:", id);
          onEditTask(id);
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
          onEditTask(id);
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

    // Attach event listeners for task changes
    if (onTaskUpdate) {
      gantt.attachEvent("onAfterTaskAdd", (id: any, task: any) => {
        console.log("Task added:", id, task);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterTaskUpdate", (id: any, task: any) => {
        console.log("Task updated:", id, task);
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
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterLinkUpdate", (id: any, link: any) => {
        console.log("Link updated:", id, link);
        onTaskUpdate();
        return true;
      });

      gantt.attachEvent("onAfterLinkDelete", (id: any) => {
        console.log("Link deleted:", id);
        onTaskUpdate();
        return true;
      });
    }

    if (this.ganttContainer.current) {
      gantt.init(this.ganttContainer.current);
      console.log("Initializing Gantt with data:", projecttasks);
      console.log("Links in projecttasks:", projecttasks.links);
      this.allTasks = projecttasks.data || [];
      gantt.parse(projecttasks);

      // Use event delegation to capture add button clicks
      if (onOpenTaskModal) {
        this.ganttContainer.current.addEventListener('click', (e: any) => {
          const target = e.target as HTMLElement;

          // Check if click is on add button or its child elements
          const addButton = target.closest('.gantt_add');
          if (addButton) {
            console.log("=== Add button clicked (via delegation) ===");

            // Find the grid row that contains this button
            const gridRow = target.closest('.gantt_grid_data .gantt_row');
            if (gridRow) {
              const taskId = gridRow.getAttribute('task_id');
              console.log("Grid row task_id:", taskId);

              if (taskId) {
                this.pendingParentId = parseInt(taskId);
                console.log("Set pendingParentId to:", this.pendingParentId);
              }
            } else {
              console.log("Could not find grid row");
            }
          }
        }, true); // Use capture phase to get the event before Gantt's handler
      }
    }

    // Expose gantt instance globally for access from parent
    (window as any).gantt = gantt;
  }

  componentDidUpdate(prevProps: GanttProps): void {
    const { projecttasks, searchQuery } = this.props;

    if (JSON.stringify(prevProps.projecttasks) !== JSON.stringify(projecttasks)) {
      this.allTasks = projecttasks.data || [];
      // Reset grouping state when data changes
      this.isGrouped = false;
      this.originalTasks = [];
      this.originalLinks = [];
      gantt.clearAll();
      gantt.parse(projecttasks);
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
    gantt.clearAll();
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
