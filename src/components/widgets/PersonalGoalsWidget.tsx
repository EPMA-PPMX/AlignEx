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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);

      const { data: goalsData, error: goalsError } = await supabase
        .from('skill_goals')
        .select('id, title, status, target_date, goal_type')
        .eq('user_id', DEMO_USER_ID)
        .in('status', ['not_started', 'in_progress'])
        .order('target_date', { ascending: true, nullsLast: true });

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
      case 'not_started': return 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A]';
      case 'in_progress': return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65]';
      case 'completed': return 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8]';
      case 'on_hold': return 'bg-gradient-to-br from-[#4D5656] to-[#95A5A6]';
      default: return 'bg-gradient-to-br from-[#4D5656] to-[#95A5A6]';
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
      <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-4 h-4" />
            My Goals
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#5B2C91]" />
          My Goals
        </h3>
        <Link
          to="/skills?tab=my-goals"
          className="text-xs text-[#5B2C91] hover:text-[#4a2377] flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {goals.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <Target className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">No active goals</p>
          <Link
            to="/skills?tab=my-goals"
            className="text-xs text-[#5B2C91] hover:text-[#4a2377]"
          >
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {goals.map((goal) => {
            const progress = getProgress(goal.id);
            const daysUntil = getDaysUntil(goal.target_date);
            const isOverdue = daysUntil !== null && daysUntil < 0;
            const isDueSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;

            return (
              <Link
                key={goal.id}
                to={`/skills?tab=my-goals&goalId=${goal.id}`}
                className="block bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-[#26D0CE] transition-all"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1">
                    <h4 className="text-gray-900 font-medium text-xs mb-1">{goal.title}</h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${getStatusColor(goal.status)} text-white`}>
                        {goal.status.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#5B2C91] bg-opacity-20 text-[#5B2C91] font-medium">
                        {goal.goal_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  {goal.target_date && (
                    <div className={`text-xs ${isOverdue ? 'text-[#E74C3C]' : isDueSoon ? 'text-[#F39C12]' : 'text-gray-600'}`}>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {isOverdue ? `${Math.abs(daysUntil!)}d overdue` : `${daysUntil}d left`}
                    </div>
                  )}
                </div>

                {progress > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-0.5">
                      <span className="text-xs">Progress</span>
                      <span className="text-xs">{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#E8E4F1] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-dark transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {goals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {goals.filter(g => g.status === 'in_progress').length} active goals
            </span>
            <Link
              to="/skills?tab=my-goals"
              className="text-[#5B2C91] hover:text-[#4a2377] flex items-center gap-1"
            >
              Manage Goals
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
