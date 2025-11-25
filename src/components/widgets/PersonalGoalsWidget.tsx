import { useState, useEffect } from 'react';
import { Target, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface SkillGoal {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  target_date: string | null;
  goal_type: string;
}

interface GoalTask {
  id: string;
  goal_id: string;
  completed: boolean;
}

export default function PersonalGoalsWidget() {
  const [goals, setGoals] = useState<SkillGoal[]>([]);
  const [tasks, setTasks] = useState<{ [goalId: string]: GoalTask[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);

      const { data: goalsData, error: goalsError } = await supabase
        .from('skill_goals')
        .select('id, title, status, target_date, goal_type')
        .eq('user_id', DEMO_USER_ID)
        .in('status', ['not_started', 'in_progress'])
        .order('target_date', { ascending: true, nullsLast: true })
        .limit(5);

      if (goalsError) throw goalsError;

      if (goalsData && goalsData.length > 0) {
        setGoals(goalsData);

        const { data: tasksData, error: tasksError } = await supabase
          .from('skill_goal_tasks')
          .select('id, goal_id, completed')
          .in('goal_id', goalsData.map(g => g.id));

        if (tasksError) throw tasksError;

        const tasksByGoal: { [key: string]: GoalTask[] } = {};
        (tasksData || []).forEach((task: GoalTask) => {
          if (!tasksByGoal[task.goal_id]) {
            tasksByGoal[task.goal_id] = [];
          }
          tasksByGoal[task.goal_id].push(task);
        });
        setTasks(tasksByGoal);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (goalId: string) => {
    const goalTasks = tasks[goalId] || [];
    if (goalTasks.length === 0) return 0;
    const completed = goalTasks.filter(t => t.completed).length;
    return Math.round((completed / goalTasks.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500';
      case 'not_started': return 'bg-gray-400';
      case 'completed': return 'bg-green-500';
      default: return 'bg-yellow-500';
    }
  };

  const getDaysUntil = (date: string | null) => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5" />
            My Goals
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          My Goals
        </h3>
        <Link
          to="/skills"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-2">No active goals</p>
          <Link
            to="/skills"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {goals.map((goal) => {
            const progress = getProgress(goal.id);
            const daysUntil = getDaysUntil(goal.target_date);
            const isOverdue = daysUntil !== null && daysUntil < 0;
            const isDueSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;

            return (
              <div
                key={goal.id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-gray-900 font-medium text-sm mb-1">{goal.title}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${getStatusColor(goal.status)} text-white`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {goal.goal_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {goal.target_date && (
                    <div className={`text-xs ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-600'}`}>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {isOverdue ? `${Math.abs(daysUntil!)}d overdue` : `${daysUntil}d left`}
                    </div>
                  )}
                </div>

                {progress > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {goals.filter(g => g.status === 'in_progress').length} active goals
            </span>
            <Link
              to="/skills"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage Goals
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
