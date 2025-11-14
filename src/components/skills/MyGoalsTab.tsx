import { useState, useEffect } from 'react';
import { Plus, Target, CheckCircle, Circle, Pause, XCircle, Calendar, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Skill {
  id: string;
  skill_name: string;
}

interface SkillGoal {
  id: string;
  user_id: string;
  skill_id: string | null;
  title: string;
  description: string | null;
  goal_type: 'certification' | 'training' | 'self_study' | 'other';
  target_date: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  notes: string | null;
  created_at: string;
  updated_at: string;
  skill?: Skill;
}

interface GoalTask {
  id: string;
  goal_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function MyGoalsTab() {
  const [goals, setGoals] = useState<SkillGoal[]>([]);
  const [tasks, setTasks] = useState<{ [goalId: string]: GoalTask[] }>({});
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SkillGoal | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [showAddTaskForm, setShowAddTaskForm] = useState<string | null>(null);

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    skill_id: '',
    goal_type: 'certification' as const,
    target_date: '',
    status: 'not_started' as const,
    notes: ''
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [goalsResult, skillsResult] = await Promise.all([
        supabase
          .from('skill_goals')
          .select(`
            *,
            skill:skills(id, skill_name)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('skills')
          .select('id, skill_name')
          .order('skill_name')
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (skillsResult.error) throw skillsResult.error;

      const goalsData = goalsResult.data || [];
      setGoals(goalsData);
      setSkills(skillsResult.data || []);

      if (goalsData.length > 0) {
        const tasksResult = await supabase
          .from('skill_goal_tasks')
          .select('*')
          .in('goal_id', goalsData.map(g => g.id))
          .order('sort_order');

        if (tasksResult.error) throw tasksResult.error;

        const tasksByGoal: { [key: string]: GoalTask[] } = {};
        (tasksResult.data || []).forEach((task: GoalTask) => {
          if (!tasksByGoal[task.goal_id]) {
            tasksByGoal[task.goal_id] = [];
          }
          tasksByGoal[task.goal_id].push(task);
        });
        setTasks(tasksByGoal);
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingGoal) {
        const { error } = await supabase
          .from('skill_goals')
          .update({
            ...goalForm,
            skill_id: goalForm.skill_id || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
        alert('Goal updated successfully!');
      } else {
        const { error } = await supabase
          .from('skill_goals')
          .insert([{
            ...goalForm,
            skill_id: goalForm.skill_id || null
          }]);

        if (error) throw error;
        alert('Goal created successfully!');
      }

      resetGoalForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal? All associated tasks will also be deleted.')) return;

    try {
      const { error } = await supabase
        .from('skill_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Goal deleted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEditGoal = (goal: SkillGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      skill_id: goal.skill_id || '',
      goal_type: goal.goal_type,
      target_date: goal.target_date || '',
      status: goal.status,
      notes: goal.notes || ''
    });
    setShowAddGoalForm(true);
  };

  const resetGoalForm = () => {
    setGoalForm({
      title: '',
      description: '',
      skill_id: '',
      goal_type: 'certification',
      target_date: '',
      status: 'not_started',
      notes: ''
    });
    setEditingGoal(null);
    setShowAddGoalForm(false);
  };

  const handleAddTask = async (goalId: string, e: React.FormEvent) => {
    e.preventDefault();

    try {
      const goalTasks = tasks[goalId] || [];
      const maxSortOrder = goalTasks.length > 0
        ? Math.max(...goalTasks.map(t => t.sort_order))
        : 0;

      const { error } = await supabase
        .from('skill_goal_tasks')
        .insert([{
          goal_id: goalId,
          ...taskForm,
          due_date: taskForm.due_date || null,
          sort_order: maxSortOrder + 1
        }]);

      if (error) throw error;

      resetTaskForm();
      loadData();
    } catch (error: any) {
      console.error('Error adding task:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleTask = async (task: GoalTask) => {
    try {
      const { error } = await supabase
        .from('skill_goal_tasks')
        .update({
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error updating task:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('skill_goal_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      due_date: '',
      notes: ''
    });
    setShowAddTaskForm(null);
  };

  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  const getStatusIcon = (status: SkillGoal['status']) => {
    switch (status) {
      case 'not_started':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'in_progress':
        return <Circle className="w-5 h-5 text-blue-600" fill="currentColor" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'on_hold':
        return <Pause className="w-5 h-5 text-yellow-600" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: SkillGoal['status']) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No target date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTaskProgress = (goalId: string) => {
    const goalTasks = tasks[goalId] || [];
    if (goalTasks.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = goalTasks.filter(t => t.completed).length;
    return {
      completed,
      total: goalTasks.length,
      percentage: Math.round((completed / goalTasks.length) * 100)
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">My Skill Goals</h3>
          <p className="text-sm text-gray-600">Track your professional development goals and progress</p>
        </div>
        <button
          onClick={() => setShowAddGoalForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Goal
        </button>
      </div>

      {showAddGoalForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            {editingGoal ? 'Edit Goal' : 'Create New Goal'}
          </h4>
          <form onSubmit={handleSaveGoal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Obtain PMP Certification"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Skill
                </label>
                <select
                  value={goalForm.skill_id}
                  onChange={(e) => setGoalForm({ ...goalForm, skill_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No specific skill</option>
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.skill_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={goalForm.goal_type}
                  onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="certification">Certification</option>
                  <option value="training">Training</option>
                  <option value="self_study">Self Study</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={goalForm.target_date}
                  onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={goalForm.status}
                  onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what you want to achieve..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={goalForm.notes}
                onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
              <button
                type="button"
                onClick={resetGoalForm}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Target className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 mb-2">No goals yet</p>
          <p className="text-sm text-gray-500">Create your first goal to start tracking your professional development</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const isExpanded = expandedGoals.has(goal.id);
            const progress = getTaskProgress(goal.id);
            const goalTasks = tasks[goal.id] || [];

            return (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          onClick={() => toggleGoalExpansion(goal.id)}
                          className="hover:bg-gray-100 rounded p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </button>
                        {getStatusIcon(goal.status)}
                        <h4 className="text-lg font-semibold text-gray-900">{goal.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(goal.status)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded border border-purple-200">
                          {goal.goal_type.replace('_', ' ')}
                        </span>
                      </div>

                      {goal.description && (
                        <p className="text-gray-600 text-sm mb-3 ml-12">{goal.description}</p>
                      )}

                      <div className="flex items-center gap-6 text-sm text-gray-500 ml-12">
                        {goal.skill && (
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            <span>{goal.skill.skill_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(goal.target_date)}</span>
                        </div>
                        {progress.total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>{progress.completed}/{progress.total} tasks</span>
                            </div>
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditGoal(goal)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit goal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete goal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.notes && (
                    <div className="ml-12 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-gray-700"><strong>Notes:</strong> {goal.notes}</p>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="font-semibold text-gray-900">Tasks</h5>
                      <button
                        onClick={() => setShowAddTaskForm(goal.id)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Task
                      </button>
                    </div>

                    {showAddTaskForm === goal.id && (
                      <form
                        onSubmit={(e) => handleAddTask(goal.id, e)}
                        className="mb-4 p-4 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Task Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={taskForm.title}
                              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="e.g., Complete online course module 1"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <input
                                type="text"
                                value={taskForm.notes}
                                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                placeholder="Optional notes"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Add Task
                            </button>
                            <button
                              type="button"
                              onClick={resetTaskForm}
                              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {goalTasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">
                        No tasks yet. Add tasks to track your progress toward this goal.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {goalTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                              task.completed
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTask(task)}
                              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              {task.notes && (
                                <p className="text-xs text-gray-600 mt-1">{task.notes}</p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                {task.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatDate(task.due_date)}</span>
                                  </div>
                                )}
                                {task.completed && task.completed_at && (
                                  <span className="text-green-600">
                                    Completed {new Date(task.completed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
