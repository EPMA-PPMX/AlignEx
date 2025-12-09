import { useState, useEffect } from 'react';
import { CheckSquare, Calendar, User, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

interface Task {
  id: string | number;
  text: string;
  type: string;
  start_date: string;
  duration: number;
  progress: number;
  owner_name?: string;
  resource_names?: string[];
  parent: string | number;
}

export default function StepTasks({ reportData, updateReportData }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (reportData.projectId) {
      loadTasks();
    }
  }, [reportData.projectId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_tasks')
        .select('task_data')
        .eq('project_id', reportData.projectId)
        .maybeSingle();

      if (error) throw error;

      if (data && data.task_data && data.task_data.data) {
        const allTasks: Task[] = data.task_data.data;
        const filteredTasks = filterTasksByWeek(allTasks);
        setTasks(filteredTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTasksByWeek = (allTasks: Task[]): Task[] => {
    if (!reportData.weekEndingDate) return allTasks;

    const weekEnd = new Date(reportData.weekEndingDate);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    return allTasks.filter((task) => {
      if (!task.start_date) return false;

      const taskStart = new Date(task.start_date);
      const taskEnd = new Date(taskStart);
      taskEnd.setDate(taskEnd.getDate() + (task.duration || 0));

      return (
        (taskStart >= weekStart && taskStart <= weekEnd) ||
        (taskEnd >= weekStart && taskEnd <= weekEnd) ||
        (taskStart <= weekStart && taskEnd >= weekEnd)
      );
    });
  };

  const getTaskStatus = (progress: number) => {
    if (progress === 0) return { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock };
    if (progress >= 1) return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    return { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: TrendingUp };
  };

  const getTaskTypeColor = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'bg-purple-100 text-purple-700';
      case 'project':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateEndDate = (startDate: string, duration: number): string => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    return end.toLocaleDateString();
  };

  const toggleTaskSelection = (taskId: string | number) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
    updateReportData('tasks', Array.from(newSelection));
  };

  if (!reportData.projectId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tasks Progress</h2>
          <p className="text-gray-600">Review tasks scheduled for this reporting period</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900">Project Required</p>
            <p className="text-sm text-yellow-700 mt-1">Please select a project first to view tasks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tasks Progress</h2>
        <p className="text-gray-600">
          {reportData.weekEndingDate
            ? `Tasks active during week ending ${new Date(reportData.weekEndingDate).toLocaleDateString()}`
            : 'Review tasks scheduled for this reporting period'}
        </p>
      </div>

      {loading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No tasks found for this reporting period</p>
          <p className="text-sm text-gray-500 mt-2">
            Tasks will appear here once they are scheduled for the selected week
          </p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">
                <span className="font-medium">{tasks.length}</span> task(s) found for this period
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => {
              const status = getTaskStatus(task.progress);
              const StatusIcon = status.icon;
              const endDate = task.start_date ? calculateEndDate(task.start_date, task.duration || 0) : 'N/A';

              return (
                <div
                  key={task.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{task.text}</h3>
                          {task.owner_name && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{task.owner_name}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getTaskTypeColor(task.type)}`}>
                            {task.type || 'task'}
                          </span>
                          <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Start Date</p>
                          <div className="flex items-center gap-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            <span>{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs mb-1">End Date</p>
                          <div className="flex items-center gap-1 text-gray-900">
                            <Calendar className="w-3 h-3" />
                            <span>{endDate}</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs mb-1">Duration</p>
                          <p className="text-gray-900">{task.duration || 0} days</p>
                        </div>

                        <div>
                          <p className="text-gray-500 text-xs mb-1">Progress</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${(task.progress || 0) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-900 font-medium text-xs">
                              {Math.round((task.progress || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {task.resource_names && task.resource_names.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Assigned Resources</p>
                          <div className="flex flex-wrap gap-1">
                            {task.resource_names.map((resource, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                              >
                                {resource}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Task Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Total Tasks</p>
                <p className="text-xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Completed</p>
                <p className="text-xl font-bold text-green-600">
                  {tasks.filter((t) => t.progress >= 1).length}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">In Progress</p>
                <p className="text-xl font-bold text-blue-600">
                  {tasks.filter((t) => t.progress > 0 && t.progress < 1).length}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Not Started</p>
                <p className="text-xl font-bold text-gray-600">
                  {tasks.filter((t) => t.progress === 0).length}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
