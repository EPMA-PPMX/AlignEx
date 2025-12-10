declare module 'frappe-gantt' {
  export interface FrappeGanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface FrappeGanttOptions {
    view_mode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year';
    on_click?: (task: FrappeGanttTask) => void;
    on_date_change?: (task: FrappeGanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: FrappeGanttTask, progress: number) => void;
    on_view_change?: (mode: string) => void;
    custom_popup_html?: (task: FrappeGanttTask) => string;
    language?: string;
  }

  export default class Gantt {
    constructor(element: HTMLElement, tasks: FrappeGanttTask[], options?: FrappeGanttOptions);
    change_view_mode(mode: string): void;
    refresh(tasks: FrappeGanttTask[]): void;
  }
}
