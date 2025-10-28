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
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();

  componentDidMount(): void {
    gantt.config.date_format = "%Y-%m-%d %H:%i";

    // Add owner column
    gantt.config.columns = [
      { name: "text", label: "Task name", tree: true, width: "*" },
      { name: "owner_name", label: "Owner", align: "center", width: 120 },
      { name: "start_date", label: "Start time", align: "center", width: 80 },
      { name: "duration", label: "Duration", align: "center", width: 70 },
      { name: "add", label: "", width: 44 }
    ];

    const { projecttasks, onTaskUpdate, onOpenTaskModal } = this.props;

    // Intercept task creation to use custom modal
    if (onOpenTaskModal) {
      // Prevent default lightbox (inline editor) from opening
      gantt.config.readonly = false;

      gantt.attachEvent("onBeforeTaskAdd", (id: any, task: any) => {
        // Open custom modal with parent ID if it's a subtask
        const parentId = task.parent || undefined;
        onOpenTaskModal(parentId);
        // Prevent the default task from being added
        return false;
      });

      gantt.attachEvent("onBeforeLightbox", (id: any) => {
        try {
          // Check if task exists
          if (!gantt.isTaskExists(id)) {
            onOpenTaskModal();
            return false;
          }

          // Check if this is a new task (temporary ID)
          const task = gantt.getTask(id);
          if (!task.text || task.text === "New task") {
            // Open custom modal for new tasks with parent ID
            const parentId = task.parent || undefined;
            gantt.deleteTask(id);
            onOpenTaskModal(parentId);
            return false;
          }
          // Allow editing existing tasks
          return true;
        } catch (error) {
          console.error("Error in onBeforeLightbox:", error);
          onOpenTaskModal();
          return false;
        }
      });
    }

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
      gantt.parse(projecttasks);
    }

    // Expose gantt instance globally for access from parent
    (window as any).gantt = gantt;
  }

  componentDidUpdate(prevProps: GanttProps): void {
    const { projecttasks } = this.props;

    if (JSON.stringify(prevProps.projecttasks) !== JSON.stringify(projecttasks)) {
      gantt.clearAll();
      gantt.parse(projecttasks);
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
