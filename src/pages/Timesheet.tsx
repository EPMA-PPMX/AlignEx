import React, { useState, useEffect } from 'react';
import { Clock, Plus, Save, Calendar, ChevronLeft, ChevronRight, Edit2, Trash2, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Resource {
  id: string;
  name: string;
  email?: string;
}

interface TimeCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface Task {
  id: string | number;
  text: string;
  project_id: string;
  project_name: string;
}

interface TimeEntry {
  id: string;
  resource_id: string;
  project_id?: string;
  task_id?: string;
  task_name?: string;
  time_category_id?: string;
  entry_date: string;
  hours: number;
  notes?: string;
  category?: TimeCategory;
}

interface WeekDay {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
}

export default function Timesheet() {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeCategories, setTimeCategories] = useState<TimeCategory[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [editingEntries, setEditingEntries] = useState<{
    [key: string]: {
      hours: string;
      notes: string;
    };
  }>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateWeekDays();
  }, [currentWeek]);

  useEffect(() => {
    if (selectedResource && weekDays.length > 0) {
      fetchTimeEntries();
    }
  }, [selectedResource, weekDays]);

  const calculateWeekDays = () => {
    const days: WeekDay[] = [];
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        date,
        dateString: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate()
      });
    }
    setWeekDays(days);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchResources(),
        fetchTimeCategories(),
        fetchTasksForResource()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('id, name, email')
      .order('name');

    if (error) {
      console.error('Error fetching resources:', error);
      return;
    }

    setResources(data || []);
    if (data && data.length > 0 && !selectedResource) {
      setSelectedResource(data[0].id);
    }
  };

  const fetchTimeCategories = async () => {
    const { data, error } = await supabase
      .from('time_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching time categories:', error);
      return;
    }

    setTimeCategories(data || []);
  };

  const fetchTasksForResource = async () => {
    if (!selectedResource) return;

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, name');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    const allTasks: Task[] = [];

    for (const project of projectsData || []) {
      const { data: taskData, error: taskError } = await supabase
        .from('project_tasks')
        .select('task_data')
        .eq('project_id', project.id)
        .maybeSingle();

      if (!taskError && taskData?.task_data?.data) {
        const projectTasks = taskData.task_data.data
          .filter((task: any) => task.text && task.id)
          .map((task: any) => ({
            id: task.id,
            text: task.text,
            project_id: project.id,
            project_name: project.name
          }));
        allTasks.push(...projectTasks);
      }
    }

    setTasks(allTasks);
  };

  const fetchTimeEntries = async () => {
    if (!selectedResource || weekDays.length === 0) return;

    const startDate = weekDays[0].dateString;
    const endDate = weekDays[6].dateString;

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        category:time_categories(*)
      `)
      .eq('resource_id', selectedResource)
      .gte('entry_date', startDate)
      .lte('entry_date', endDate);

    if (error) {
      console.error('Error fetching time entries:', error);
      return;
    }

    setTimeEntries(data || []);
  };

  const getEntryForTaskAndDate = (taskId: string | null, categoryId: string | null, dateString: string) => {
    return timeEntries.find(entry => {
      if (taskId) {
        return entry.task_id === taskId && entry.entry_date === dateString;
      } else if (categoryId) {
        return entry.time_category_id === categoryId && entry.entry_date === dateString;
      }
      return false;
    });
  };

  const getEditingKey = (taskId: string | null, categoryId: string | null, dateString: string) => {
    return `${taskId || categoryId}-${dateString}`;
  };

  const handleHoursChange = (taskId: string | null, categoryId: string | null, dateString: string, hours: string) => {
    const key = getEditingKey(taskId, categoryId, dateString);
    setEditingEntries(prev => ({
      ...prev,
      [key]: {
        hours,
        notes: prev[key]?.notes || ''
      }
    }));
  };

  const handleNotesChange = (taskId: string | null, categoryId: string | null, dateString: string, notes: string) => {
    const key = getEditingKey(taskId, categoryId, dateString);
    setEditingEntries(prev => ({
      ...prev,
      [key]: {
        hours: prev[key]?.hours || '',
        notes
      }
    }));
  };

  const saveTimeEntry = async (taskId: string | null, categoryId: string | null, dateString: string) => {
    if (!selectedResource) return;

    const key = getEditingKey(taskId, categoryId, dateString);
    const editing = editingEntries[key];

    if (!editing?.hours || parseFloat(editing.hours) === 0) {
      const existingEntry = getEntryForTaskAndDate(taskId, categoryId, dateString);
      if (existingEntry) {
        await deleteTimeEntry(existingEntry.id);
      }
      return;
    }

    const hours = parseFloat(editing.hours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      alert('Please enter valid hours (0-24)');
      return;
    }

    setSaving(true);
    try {
      const existingEntry = getEntryForTaskAndDate(taskId, categoryId, dateString);

      const entryData: any = {
        resource_id: selectedResource,
        entry_date: dateString,
        hours,
        notes: editing.notes || null,
        updated_at: new Date().toISOString()
      };

      if (taskId) {
        const task = tasks.find(t => String(t.id) === taskId);
        entryData.project_id = task?.project_id;
        entryData.task_id = taskId;
        entryData.task_name = task?.text;
        entryData.time_category_id = null;
      } else if (categoryId) {
        entryData.time_category_id = categoryId;
        entryData.project_id = null;
        entryData.task_id = null;
        entryData.task_name = null;
      }

      if (existingEntry) {
        const { error } = await supabase
          .from('time_entries')
          .update(entryData)
          .eq('id', existingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('time_entries')
          .insert({ ...entryData, created_at: new Date().toISOString() });

        if (error) throw error;
      }

      await fetchTimeEntries();

      setEditingEntries(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    } catch (error) {
      console.error('Error saving time entry:', error);
      alert('Failed to save time entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteTimeEntry = async (entryId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      await fetchTimeEntries();
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Failed to delete time entry');
    } finally {
      setSaving(false);
    }
  };

  const getTotalHoursForDay = (dateString: string) => {
    return timeEntries
      .filter(entry => entry.entry_date === dateString)
      .reduce((sum, entry) => sum + parseFloat(String(entry.hours)), 0);
  };

  const getTotalHoursForRow = (taskId: string | null, categoryId: string | null) => {
    return weekDays.reduce((sum, day) => {
      const entry = getEntryForTaskAndDate(taskId, categoryId, day.dateString);
      return sum + (entry ? parseFloat(String(entry.hours)) : 0);
    }, 0);
  };

  const previousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading timesheet...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Timesheet</h1>
        </div>
        <button
          onClick={() => setShowCategoryManager(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Manage Categories
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Resource:</label>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {resources.map(resource => (
                <option key={resource.id} value={resource.id}>
                  {resource.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[200px] text-center">
              {weekDays.length > 0 && `${weekDays[0].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
            </span>
            <button
              onClick={nextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">
                  Task / Category
                </th>
                {weekDays.map(day => (
                  <th key={day.dateString} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div>{day.dayName}</div>
                    <div className="text-gray-500 font-normal">{day.dayNumber}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.length > 0 && (
                <>
                  <tr className="bg-blue-50">
                    <td colSpan={9} className="px-6 py-2 text-sm font-semibold text-blue-900">
                      Project Tasks
                    </td>
                  </tr>
                  {tasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{task.text}</div>
                        <div className="text-xs text-gray-500">{task.project_name}</div>
                      </td>
                      {weekDays.map(day => {
                        const entry = getEntryForTaskAndDate(String(task.id), null, day.dateString);
                        const key = getEditingKey(String(task.id), null, day.dateString);
                        const editing = editingEntries[key];
                        const displayHours = editing?.hours ?? (entry?.hours ? String(entry.hours) : '');

                        return (
                          <td key={day.dateString} className="px-2 py-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={displayHours}
                              onChange={(e) => handleHoursChange(String(task.id), null, day.dateString, e.target.value)}
                              onBlur={() => saveTimeEntry(String(task.id), null, day.dateString)}
                              className="w-full px-2 py-1 text-center text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {getTotalHoursForRow(String(task.id), null).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              {timeCategories.length > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td colSpan={9} className="px-6 py-2 text-sm font-semibold text-green-900">
                      Non-Project Time
                    </td>
                  </tr>
                  {timeCategories.map(category => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        {category.description && (
                          <div className="text-xs text-gray-500">{category.description}</div>
                        )}
                      </td>
                      {weekDays.map(day => {
                        const entry = getEntryForTaskAndDate(null, category.id, day.dateString);
                        const key = getEditingKey(null, category.id, day.dateString);
                        const editing = editingEntries[key];
                        const displayHours = editing?.hours ?? (entry?.hours ? String(entry.hours) : '');

                        return (
                          <td key={day.dateString} className="px-2 py-2">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={displayHours}
                              onChange={(e) => handleHoursChange(null, category.id, day.dateString, e.target.value)}
                              onBlur={() => saveTimeEntry(null, category.id, day.dateString)}
                              className="w-full px-2 py-1 text-center text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center text-sm font-medium text-gray-900">
                        {getTotalHoursForRow(null, category.id).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </>
              )}

              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">Daily Total</td>
                {weekDays.map(day => (
                  <td key={day.dateString} className="px-4 py-4 text-center text-sm text-gray-900">
                    {getTotalHoursForDay(day.dateString).toFixed(1)}
                  </td>
                ))}
                <td className="px-4 py-4 text-center text-sm text-gray-900">
                  {weekDays.reduce((sum, day) => sum + getTotalHoursForDay(day.dateString), 0).toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showCategoryManager && (
        <CategoryManager
          onClose={() => {
            setShowCategoryManager(false);
            fetchTimeCategories();
          }}
        />
      )}
    </div>
  );
}

function CategoryManager({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState<TimeCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<TimeCategory | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('time_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const saveCategory = async () => {
    if (!form.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('time_categories')
          .update({
            name: form.name,
            description: form.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('time_categories')
          .insert({
            name: form.name,
            description: form.description || null,
            is_active: true
          });

        if (error) throw error;
      }

      setForm({ name: '', description: '' });
      setEditingCategory(null);
      setShowAddForm(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const toggleCategoryStatus = async (category: TimeCategory) => {
    const { error } = await supabase
      .from('time_categories')
      .update({
        is_active: !category.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', category.id);

    if (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    } else {
      fetchCategories();
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    const { error } = await supabase
      .from('time_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    } else {
      fetchCategories();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Manage Time Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {showAddForm || editingCategory ? (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., PTO, Training"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveCategory}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setForm({ name: '', description: '' });
                      setEditingCategory(null);
                      setShowAddForm(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading categories...</div>
          ) : (
            <div className="space-y-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setForm({ name: category.name, description: category.description || '' });
                        setShowAddForm(false);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleCategoryStatus(category)}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        category.is_active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {category.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
