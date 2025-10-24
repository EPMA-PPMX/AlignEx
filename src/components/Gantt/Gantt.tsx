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
  owner?: string;
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
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();

  componentDidMount(): void {
    gantt.config.date_format = "%Y-%m-%d %H:%i";

    // Add custom column for task owner
    gantt.config.columns = [
      { name: "text", label: "Task", tree: true, width: "*" },
      { name: "start_date", label: "Start", align: "center", width: 100 },
      { name: "duration", label: "Duration", align: "center", width: 70 },
      { name: "owner", label: "Owner", align: "center", width: 120 },
      { name: "add", label: "", width: 44 }
    ];

    // Configure lightbox to include owner field
    gantt.config.lightbox.sections = [
      { name: "description", height: 38, map_to: "text", type: "textarea", focus: true },
      { name: "owner", height: 22, map_to: "owner", type: "textarea" },
      { name: "time", type: "duration", map_to: "auto" }
    ];

    const { projecttasks, onTaskUpdate } = this.props;

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
