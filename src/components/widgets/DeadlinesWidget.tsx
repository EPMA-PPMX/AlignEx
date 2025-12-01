import { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Target, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'goal' | 'project';
  source_id: string;
  project_name?: string;
  priority?: string;
}

export default function DeadlinesWidget() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      setLoading(true);
      const allDeadlines: Deadline[] = [];

      const { data: tasks, error: tasksError } = await supabase
        .from('project_tasks')
        .select(`
          id,
          project_id,
          task_data,
          projects (name)
        `)
        .not('task_data->due_date', 'is', null);

      if (tasksError) throw tasksError;

      (tasks || []).forEach((task: any) => {
        const taskData = task.task_data || {};
        if (taskData.assigned_to === DEMO_USER_ID && taskData.due_date) {
          allDeadlines.push({
            id: task.id,
            title: taskData.title || 'Untitled Task',
            date: taskData.due_date,
            type: 'task',
            source_id: task.project_id,
            project_name: task.projects?.name,
            priority: taskData.priority
          });
        }
      });

      const { data: goals, error: goalsError } = await supabase
        .from('skill_goals')
        .select('id, title, target_date, goal_type')
        .eq('user_id', DEMO_USER_ID)
        .not('target_date', 'is', null)
        .in('status', ['not_started', 'in_progress']);

      if (goalsError) throw goalsError;

      (goals || []).forEach((goal: any) => {
        allDeadlines.push({
          id: goal.id,
          title: goal.title,
          date: goal.target_date,
          type: 'goal',
          source_id: goal.id
        });
      });

      allDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const filtered = allDeadlines.filter(d => {
        const deadlineDate = new Date(d.date);
        return deadlineDate <= thirtyDaysFromNow;
      });

      setDeadlines(filtered.slice(0, 8));
    } catch (err) {
      console.error('Error fetching deadlines:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntil = (date: string) => {
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDeadlineColor = (days: number) => {
    if (days < 0) return 'text-red-700 bg-red-100';
    if (days === 0) return 'text-yellow-700 bg-yellow-100';
    if (days <= 3) return 'text-orange-700 bg-orange-100';
    if (days <= 7) return 'text-blue-700 bg-blue-100';
    return 'text-gray-700 bg-gray-100';
  };

  const getDeadlineText = (days: number) => {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return <AlertCircle className="w-4 h-4" />;
      case 'goal': return <Target className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const overdueCount = deadlines.filter(d => getDaysUntil(d.date) < 0).length;
  const dueTodayCount = deadlines.filter(d => getDaysUntil(d.date) === 0).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Deadlines
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Upcoming Deadlines
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

      {deadlines.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No upcoming deadlines</p>
          <p className="text-sm text-gray-500">You're all clear for now!</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {deadlines.map((deadline) => {
            const daysUntil = getDaysUntil(deadline.date);
            const isOverdue = daysUntil < 0;

            return (
              <div
                key={`${deadline.type}-${deadline.id}`}
                className={`bg-gray-50 p-3 rounded-lg border transition-all ${
                  isOverdue
                    ? 'border-red-300 hover:border-red-400'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-600">{getTypeIcon(deadline.type)}</span>
                      <h4 className="text-gray-900 font-medium text-sm truncate">{deadline.title}</h4>
                    </div>
                    {deadline.project_name && (
                      <p className="text-xs text-gray-600 truncate">{deadline.project_name}</p>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${getDeadlineColor(daysUntil)}`}>
                    {isOverdue && <AlertCircle className="w-3 h-3" />}
                    {getDeadlineText(daysUntil)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deadlines.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{deadlines.length} upcoming</span>
            <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Calendar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
