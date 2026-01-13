import { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, FolderOpen, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  task_id?: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  duration: number;
  progress: number;
  assigned_to: string;
  project?: {
    id: string;
    name: string;
  };
}

interface GroupedTasks {
  [projectId: string]: {
    projectName: string;
    projectId: string;
    tasks: Task[];
  };
}

export default function MyTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Get user's resource_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('resource_id')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (userError || !userData?.resource_id) {
        console.log('MyTasksWidget: User has no resource_id, cannot fetch tasks');
        setTasks([]);
        setLoading(false);
        return;
      }

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const myTasks: Task[] = [];

      (data || []).forEach((projectTask: any) => {
        const ganttData = projectTask.task_data?.data || [];

        ganttData.forEach((task: any) => {
          if (!task.start_date) return;

          const taskStartDate = new Date(task.start_date);
          taskStartDate.setHours(0, 0, 0, 0);

          // Check if the task is assigned to the user's resource_id using owner_id
          const isAssignedToMe = task.owner_id === userData.resource_id;
          const isNotCompleted = task.status !== 'Completed' && task.status !== 'Cancelled';
          const isRelevantDate = taskStartDate <= nextWeek;

          if (isAssignedToMe && isNotCompleted && isRelevantDate) {
            myTasks.push({
              id: projectTask.id,
              task_id: task.id,
              project_id: projectTask.project_id,
              title: task.text || 'Untitled Task',
              status: task.status || 'Not Started',
              priority: task.priority || 'Medium',
              start_date: task.start_date,
              end_date: task.end_date || null,
              duration: task.duration || 0,
              progress: task.progress || 0,
              assigned_to: task.owner_id,
              project: projectTask.projects
            });
          }
        });
      });

      myTasks.sort((a, b) => {
        const dateA = new Date(a.start_date!).getTime();
        const dateB = new Date(b.start_date!).getTime();
        return dateA - dateB;
      });

      setTasks(myTasks.slice(0, 10));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysFromToday = (date: string | null) => {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const groupedTasks: GroupedTasks = tasks.reduce((acc, task) => {
    const projectId = task.project_id;
    if (!acc[projectId]) {
      acc[projectId] = {
        projectName: task.project?.name || 'Unknown Project',
        projectId: projectId,
        tasks: []
      };
    }
    acc[projectId].tasks.push(task);
    return acc;
  }, {} as GroupedTasks);

  const overdueCount = tasks.filter(t => {
    const days = getDaysFromToday(t.start_date);
    return days !== null && days < 0;
  }).length;

  const startingTodayCount = tasks.filter(t => {
    const days = getDaysFromToday(t.start_date);
    return days === 0;
  }).length;

  if (loading) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            My Tasks
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#5B2C91]" />
          My Tasks
        </h3>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="px-2 py-1 bg-[#E74C3C] bg-opacity-20 text-[#E74C3C] text-xs rounded-full font-medium">
              {overdueCount} overdue
            </span>
          )}
          {startingTodayCount > 0 && (
            <span className="px-2 py-1 bg-[#F39C12] bg-opacity-20 text-[#F39C12] text-xs rounded-full font-medium">
              {startingTodayCount} today
            </span>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <CheckSquare className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No tasks assigned</p>
          <p className="text-sm text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {Object.values(groupedTasks).map((group) => (
            <div key={group.projectId} className="space-y-2">
              <Link
                to={`/projects/${group.projectId}`}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#5B2C91] transition-colors group"
              >
                <FolderOpen className="w-4 h-4 text-gray-400 group-hover:text-[#5B2C91]" />
                <span className="truncate">{group.projectName}</span>
                <span className="text-xs text-gray-500">({group.tasks.length})</span>
              </Link>

              <div className="space-y-1.5 ml-6">
                {group.tasks.map((task) => {
                  const daysFromToday = getDaysFromToday(task.start_date);
                  const isOverdue = daysFromToday !== null && daysFromToday < 0;
                  const isStartingToday = daysFromToday === 0;
                  const isStartingSoon = daysFromToday !== null && daysFromToday > 0 && daysFromToday <= 3;

                  return (
                    <Link
                      key={`${task.project_id}-${task.task_id}`}
                      to={`/projects/${task.project_id}`}
                      className="block bg-gray-50 p-2.5 rounded-lg border border-gray-200 hover:border-[#26D0CE] transition-all"
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-gray-900 font-medium text-sm truncate">{task.title}</h4>
                        </div>
                        {isOverdue && (
                          <AlertCircle className="w-4 h-4 text-[#E74C3C] flex-shrink-0 ml-2" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Start:</span>
                              <span>{task.start_date ? new Date(task.start_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Finish:</span>
                              <span>{task.end_date ? new Date(task.end_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#26D0CE] h-full rounded-full transition-all"
                              style={{ width: `${(task.progress || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 min-w-[3rem] text-right">
                            {Math.round((task.progress || 0) * 100)}%
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{tasks.length} active tasks</span>
            <Link to="/projects" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
