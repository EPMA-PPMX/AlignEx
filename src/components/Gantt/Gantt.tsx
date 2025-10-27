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
  onDataChange?: (data: { data: Task[]; links: Link[] }) => void;
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();

  componentDidMount(): void {
    gantt.config.date_format = "%Y-%m-%d %H:%i";

    // Enable auto-scheduling to automatically adjust task dates based on dependencies
    gantt.config.auto_scheduling = true;
    gantt.config.auto_scheduling_strict = true;
    gantt.config.auto_scheduling_compatibility = true;

    // Enable auto-scheduling to work on link creation
    gantt.config.auto_scheduling_initial = false;
    gantt.config.auto_scheduling_use_progress = false;

    // Attach event handlers to capture changes
    this.attachEventHandlers();

    const { projecttasks } = this.props;

    if (this.ganttContainer.current) {
      gantt.init(this.ganttContainer.current);
      gantt.parse(projecttasks);

      // Enable auto-scheduling after initialization
      gantt.autoSchedule();
    }
  }

  attachEventHandlers(): void {
    const { onDataChange } = this.props;

    if (!onDataChange) return;

    // After any task is added, updated, or deleted
    gantt.attachEvent("onAfterTaskAdd", () => this.saveData());
    gantt.attachEvent("onAfterTaskUpdate", () => this.saveData());
    gantt.attachEvent("onAfterTaskDelete", () => this.saveData());

    // After any link is added - manually handle finish-to-start dependency
    gantt.attachEvent("onAfterLinkAdd", (id, link) => {
      // Get the predecessor (source) and successor (target) tasks
      const predecessor = gantt.getTask(link.source);
      const successor = gantt.getTask(link.target);

      if (predecessor && successor) {
        // Calculate the end date of the predecessor
        const predecessorEndDate = gantt.calculateEndDate({
          start_date: predecessor.start_date,
          duration: predecessor.duration,
          task: predecessor
        });

        // Set the successor to start right after the predecessor ends
        successor.start_date = predecessorEndDate;
        gantt.updateTask(successor.id);
      }

      // Try auto-schedule if available (for premium users)
      if (typeof gantt.autoSchedule === 'function') {
        gantt.autoSchedule();
      }

      this.saveData();
    });

    gantt.attachEvent("onAfterLinkDelete", () => {
      if (typeof gantt.autoSchedule === 'function') {
        gantt.autoSchedule();
      }
      this.saveData();
    });
  }

  saveData(): void {
    const { onDataChange } = this.props;
    if (!onDataChange) return;

    // Get all tasks and links from gantt
    const tasks: Task[] = [];
    gantt.eachTask((task) => {
      tasks.push({
        id: task.id,
        text: task.text,
        start_date: gantt.templates.format_date(task.start_date),
        duration: task.duration,
        progress: task.progress,
        parent: task.parent,
      });
    });

    const links: Link[] = gantt.getLinks().map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type,
    }));

    onDataChange({ data: tasks, links });
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
