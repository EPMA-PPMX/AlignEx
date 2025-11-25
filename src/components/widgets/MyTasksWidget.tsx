import { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  project?: {
    id: string;
    name: string;
  };
}

export default function MyTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          id,
          project_id,
          task_data,
          projects (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const myTasks = (data || [])
        .filter((task: any) => {
          const taskData = task.task_data || {};
          return taskData.assigned_to === DEMO_USER_ID &&
                 taskData.status !== 'Completed' &&
                 taskData.status !== 'Cancelled';
        })
        .map((task: any) => ({
          id: task.id,
          project_id: task.project_id,
          title: task.task_data?.title || 'Untitled Task',
          status: task.task_data?.status || 'Not Started',
          priority: task.task_data?.priority || 'Medium',
          due_date: task.task_data?.due_date || null,
          assigned_to: task.task_data?.assigned_to || '',
          project: task.projects
        }))
        .slice(0, 10);

      setTasks(myTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': case 'critical': return 'text-red-700 bg-red-100';
      case 'medium': return 'text-yellow-700 bg-yellow-100';
      case 'low': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const aDays = getDaysUntil(a.due_date);
    const bDays = getDaysUntil(b.due_date);

    if (aDays === null && bDays === null) return 0;
    if (aDays === null) return 1;
    if (bDays === null) return -1;

    return aDays - bDays;
  });

  const overdueCount = sortedTasks.filter(t => {
    const days = getDaysUntil(t.due_date);
    return days !== null && days < 0;
  }).length;

  const dueTodayCount = sortedTasks.filter(t => {
    const days = getDaysUntil(t.due_date);
    return days === 0;
  }).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            My Tasks
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          My Tasks
        </h3>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
              {overdueCount} overdue
            </span>
          )}
          {dueTodayCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
              {dueTodayCount} today
            </span>
          )}
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <CheckSquare className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No tasks assigned</p>
          <p className="text-sm text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {sortedTasks.map((task) => {
            const daysUntil = getDaysUntil(task.due_date);
            const isOverdue = daysUntil !== null && daysUntil < 0;
            const isDueToday = daysUntil === 0;
            const isDueSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 3;

            return (
              <Link
                key={task.id}
                to={`/projects/${task.project_id}`}
                className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 font-medium text-sm mb-1 truncate">{task.title}</h4>
                    <p className="text-xs text-gray-600 truncate">{task.project?.name}</p>
                  </div>
                  {isOverdue && (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 ml-2" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                      {task.status}
                    </span>
                  </div>

                  {task.due_date && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      isOverdue ? 'text-red-600' :
                      isDueToday ? 'text-yellow-600' :
                      isDueSoon ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {isOverdue ? `${Math.abs(daysUntil!)}d overdue` :
                       isDueToday ? 'Due today' :
                       `${daysUntil}d left`}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {sortedTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{sortedTasks.length} active tasks</span>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
