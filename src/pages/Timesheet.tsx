import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimesheetEntry {
  id: string;
  entry_date: string;
  hours: number;
  project_id: string | null;
  initiation_request_id: string | null;
  non_project_category_id: string | null;
  notes: string;
  project?: { name: string };
  initiation_request?: { project_name: string };
  non_project_category?: { name: string };
}

interface Project {
  id: string;
  name: string;
}

interface InitiationRequest {
  id: string;
  project_name: string;
}

interface NonProjectCategory {
  id: string;
  name: string;
  is_active: boolean;
}

const Timesheet: React.FC = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [initiationRequests, setInitiationRequests] = useState<InitiationRequest[]>([]);
  const [categories, setCategories] = useState<NonProjectCategory[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    return new Date(today.setDate(diff));
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    entry_date: '',
    hours: '',
    type: 'project',
    project_id: '',
    initiation_request_id: '',
    category_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const fetchData = async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const { data: entriesData } = await supabase
      .from('timesheet_entries')
      .select(`
        *,
        project:projects(name),
        initiation_request:project_initiation_requests(project_name),
        non_project_category:non_project_categories(name)
      `)
      .gte('entry_date', currentWeekStart.toISOString().split('T')[0])
      .lte('entry_date', weekEnd.toISOString().split('T')[0])
      .order('entry_date', { ascending: false });

    const { data: projectsData } = await supabase
      .from('projects')
      .select('id, name')
      .eq('state', 'active')
      .order('name');

    const { data: requestsData } = await supabase
      .from('project_initiation_requests')
      .select('id, project_name')
      .eq('status', 'approved')
      .order('project_name');

    const { data: categoriesData } = await supabase
      .from('non_project_categories')
      .select('*')
      .eq('is_active', true)
      .order('name');

    setEntries(entriesData || []);
    setProjects(projectsData || []);
    setInitiationRequests(requestsData || []);
    setCategories(categoriesData || []);
  };

  const handleAddEntry = async () => {
    if (!newEntry.entry_date || !newEntry.hours) {
      alert('Please fill in date and hours');
      return;
    }

    const entryData: any = {
      entry_date: newEntry.entry_date,
      hours: parseFloat(newEntry.hours),
      notes: newEntry.notes,
      project_id: null,
      initiation_request_id: null,
      non_project_category_id: null
    };

    if (newEntry.type === 'project' && newEntry.project_id) {
      entryData.project_id = newEntry.project_id;
    } else if (newEntry.type === 'initiation' && newEntry.initiation_request_id) {
      entryData.initiation_request_id = newEntry.initiation_request_id;
    } else if (newEntry.type === 'category' && newEntry.category_id) {
      entryData.non_project_category_id = newEntry.category_id;
    } else {
      alert('Please select a project, initiation request, or category');
      return;
    }

    const { error } = await supabase
      .from('timesheet_entries')
      .insert([entryData]);

    if (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry');
    } else {
      setShowAddModal(false);
      setNewEntry({
        entry_date: '',
        hours: '',
        type: 'project',
        project_id: '',
        initiation_request_id: '',
        category_id: '',
        notes: ''
      });
      fetchData();
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    const { error } = await supabase
      .from('timesheet_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting entry:', error);
    } else {
      fetchData();
    }
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.hours.toString()), 0);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getEntryName = (entry: TimesheetEntry) => {
    if (entry.project) return entry.project.name;
    if (entry.initiation_request) return entry.initiation_request.project_name;
    if (entry.non_project_category) return entry.non_project_category.name;
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheet</h1>
          <p className="text-gray-600 mt-1">Track time for projects and activities</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Time Entry
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-semibold">
            Week of {formatDate(currentWeekStart)} - {formatDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Total Hours This Week</div>
          <div className="text-2xl font-bold text-blue-600">{totalHours.toFixed(2)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Project/Activity</th>
                <th className="text-left py-3 px-4">Hours</th>
                <th className="text-left py-3 px-4">Notes</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    No time entries for this week
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {new Date(entry.entry_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium">{getEntryName(entry)}</td>
                    <td className="py-3 px-4">{entry.hours}</td>
                    <td className="py-3 px-4 text-gray-600">{entry.notes || '-'}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Time Entry</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={newEntry.entry_date}
                  onChange={(e) => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={newEntry.hours}
                  onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={newEntry.type}
                  onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="project">Project</option>
                  <option value="initiation">Project Initiation</option>
                  <option value="category">Non-Project Work</option>
                </select>
              </div>

              {newEntry.type === 'project' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={newEntry.project_id}
                    onChange={(e) => setNewEntry({ ...newEntry, project_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newEntry.type === 'initiation' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initiation Request
                  </label>
                  <select
                    value={newEntry.initiation_request_id}
                    onChange={(e) => setNewEntry({ ...newEntry, initiation_request_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select an initiation request</option>
                    {initiationRequests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {newEntry.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newEntry.category_id}
                    onChange={(e) => setNewEntry({ ...newEntry, category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
