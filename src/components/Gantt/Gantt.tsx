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

  public toggleGroupByOwner = (): void => {
    if (this.isGrouped) {
      // Reset to original order
      gantt.sort((a: any, b: any) => {
        return a.id - b.id;
      });
      this.isGrouped = false;
    } else {
      // Sort tasks by owner_name
      gantt.sort((a: any, b: any) => {
        const ownerA = a.owner_name || 'Unassigned';
        const ownerB = b.owner_name || 'Unassigned';

        if (ownerA === ownerB) {
          // If same owner, maintain original order
          return a.id - b.id;
        }

        return ownerA.localeCompare(ownerB);
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

    // Enable column resizing
    gantt.config.grid_resize = true;

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

    // Custom add button column with resizable columns and inline editors
    gantt.config.columns = [
      { name: "text", label: "Task name", tree: true, width: 250, resize: true, editor: textEditor },
      { name: "owner_name", label: "Owner", align: "center", width: 120, resize: true },
      { name: "start_date", label: "Start time", align: "center", width: 80, resize: true, editor: dateEditor },
      { name: "duration", label: "Duration", align: "center", width: 70, resize: true, editor: durationEditor },
      { name: "add", label: "", width: 44 }
    ];

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
      gantt.clearAll();
      gantt.parse(projecttasks);
    }

    if (prevProps.searchQuery !== searchQuery) {
      this.filterTasks(searchQuery || '');
    }
  }

  private filterTasks(query: string): void {
    const { projecttasks } = this.props;

    if (!query.trim()) {
      gantt.clearAll();
      gantt.parse(projecttasks);
      return;
    }

    const lowerQuery = query.toLowerCase();
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
