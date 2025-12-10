import React, { Component, createRef } from "react";
import FrappeGantt from "frappe-gantt";
import "./Gantt.css";

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

interface GanttProps {
  projecttasks: {
    data: Task[];
    links?: Link[];
    baseline?: any[];
  };
  onTaskUpdate?: () => void;
  onOpenTaskModal?: (parentId?: number) => void;
  onEditTask?: (taskId: number) => void;
  searchQuery?: string;
  selectedTaskFields?: string[];
  taskCustomFields?: CustomField[];
}

interface FrappeTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies?: string;
  custom_class?: string;
}

export default class Gantt extends Component<GanttProps> {
  private ganttContainer = createRef<HTMLDivElement>();
  private ganttInstance: any = null;
  private allTasks: Task[] = [];
  private isGrouped: boolean = false;
  private originalTasks: any[] = [];
  private originalLinks: any[] = [];

  public isGroupedByOwner = (): boolean => {
    return this.isGrouped;
  };

  public getGanttInstance = () => {
    return this.ganttInstance;
  };

  public setBaseline = (baselineNum: number = 0): any[] => {
    const baselineData: any[] = [];
    const tasks = this.props.projecttasks?.data || [];

    tasks.forEach((task: any) => {
      const startDate = new Date(task.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + task.duration);

      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 16).replace('T', ' ');
      };

      baselineData.push({
        task_id: task.id,
        [`baseline${baselineNum}_StartDate`]: formatDate(startDate),
        [`baseline${baselineNum}_EndDate`]: formatDate(endDate)
      });
    });

    return baselineData;
  };

  public groupByOwner = (ownerField: string): void => {
    if (!this.props.projecttasks?.data) return;

    this.isGrouped = true;
    this.originalTasks = [...this.props.projecttasks.data];
    this.originalLinks = [...(this.props.projecttasks.links || [])];

    const groupedTasks: { [key: string]: Task[] } = {};
    this.originalTasks.forEach(task => {
      const owner = (task as any)[ownerField] || 'Unassigned';
      if (!groupedTasks[owner]) {
        groupedTasks[owner] = [];
      }
      groupedTasks[owner].push(task);
    });

    this.renderGantt();
  };

  public clearGrouping = (): void => {
    this.isGrouped = false;
    if (this.originalTasks.length > 0) {
      this.props.projecttasks.data = this.originalTasks;
      this.originalTasks = [];
      this.originalLinks = [];
    }
    this.renderGantt();
  };

  public refreshSearch = (searchQuery: string): void => {
    this.renderGantt();
  };

  componentDidMount() {
    this.renderGantt();
  }

  componentDidUpdate(prevProps: GanttProps) {
    if (
      prevProps.projecttasks !== this.props.projecttasks ||
      prevProps.searchQuery !== this.props.searchQuery
    ) {
      this.renderGantt();
    }
  }

  componentWillUnmount() {
    if (this.ganttInstance) {
      this.ganttInstance = null;
    }
  }

  private convertToFrappeTasks = (): FrappeTask[] => {
    const tasks = this.props.projecttasks?.data || [];
    const links = this.props.projecttasks?.links || [];
    const searchQuery = this.props.searchQuery?.toLowerCase() || '';

    return tasks
      .filter(task => {
        if (!searchQuery) return true;
        return task.text.toLowerCase().includes(searchQuery);
      })
      .map(task => {
        const startDate = new Date(task.start_date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (task.duration || 1));

        const dependencies = links
          .filter(link => link.target === task.id)
          .map(link => link.source.toString())
          .join(',');

        return {
          id: task.id.toString(),
          name: task.text,
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          progress: task.progress || 0,
          dependencies: dependencies || undefined,
          custom_class: task.type || ''
        };
      });
  };

  private renderGantt = () => {
    if (!this.ganttContainer.current) return;

    const frappeTasks = this.convertToFrappeTasks();

    if (frappeTasks.length === 0) {
      this.ganttContainer.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No tasks to display</div>';
      return;
    }

    this.ganttContainer.current.innerHTML = '';

    try {
      this.ganttInstance = new FrappeGantt(this.ganttContainer.current, frappeTasks, {
        view_mode: 'Week',
        on_click: (task: any) => {
          if (this.props.onEditTask) {
            this.props.onEditTask(parseInt(task.id));
          }
        },
        on_date_change: (task: any, start: Date, end: Date) => {
          const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const originalTask = this.props.projecttasks.data.find(t => t.id === parseInt(task.id));

          if (originalTask) {
            originalTask.start_date = start.toISOString().split('T')[0];
            originalTask.duration = duration;

            if (this.props.onTaskUpdate) {
              this.props.onTaskUpdate();
            }
          }
        },
        on_progress_change: (task: any, progress: number) => {
          const originalTask = this.props.projecttasks.data.find(t => t.id === parseInt(task.id));

          if (originalTask) {
            originalTask.progress = progress;

            if (this.props.onTaskUpdate) {
              this.props.onTaskUpdate();
            }
          }
        }
      });
    } catch (error) {
      console.error('Error rendering Gantt chart:', error);
      this.ganttContainer.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Error rendering Gantt chart</div>';
    }
  };

  public changeViewMode = (mode: string) => {
    if (this.ganttInstance) {
      this.ganttInstance.change_view_mode(mode);
    }
  };

  render() {
    return (
      <div className="gantt-wrapper">
        <div className="gantt-controls" style={{ padding: '10px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => this.changeViewMode('Day')}
            style={{
              padding: '6px 12px',
              marginRight: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Day
          </button>
          <button
            onClick={() => this.changeViewMode('Week')}
            style={{
              padding: '6px 12px',
              marginRight: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Week
          </button>
          <button
            onClick={() => this.changeViewMode('Month')}
            style={{
              padding: '6px 12px',
              marginRight: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Month
          </button>
        </div>
        <div ref={this.ganttContainer} style={{ overflow: 'auto', height: 'calc(100% - 50px)' }} />
      </div>
    );
  }
}
