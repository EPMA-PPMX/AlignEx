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

    // Attach event handlers to capture changes
    this.attachEventHandlers();

    const { projecttasks } = this.props;

    if (this.ganttContainer.current) {
      gantt.init(this.ganttContainer.current);
      gantt.parse(projecttasks);
    }
  }

  attachEventHandlers(): void {
    const { onDataChange } = this.props;

    if (!onDataChange) return;

    // After any task is added, updated, or deleted
    gantt.attachEvent("onAfterTaskAdd", () => this.saveData());
    gantt.attachEvent("onAfterTaskUpdate", () => this.saveData());
    gantt.attachEvent("onAfterTaskDelete", () => this.saveData());

    // After any link is added or deleted
    gantt.attachEvent("onAfterLinkAdd", () => this.saveData());
    gantt.attachEvent("onAfterLinkDelete", () => this.saveData());
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
