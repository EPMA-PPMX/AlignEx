import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronLeft, ChevronRight, Edit2, Save, X } from 'lucide-react';

interface TimesheetEntry {
  id: string;
  entry_date: string;
  hours: number;
  is_billable: boolean;
  project_id: string | null;
  initiation_request_id: string | null;
  non_project_category_id: string | null;
  notes: string;
}

interface Project {
  id: string;
  name: string;
  state: string;
}

interface InitiationRequest {
  id: string;
  project_name: string;
  status: string;
}

interface NonProjectCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface TimesheetRow {
  id: string;
  name: string;
  type: 'project' | 'initiation' | 'category';
  typeId: string;
  entries: { [date: string]: { id: string; billable: number; nonBillable: number; notes: string } };
}

const Timesheet: React.FC = () => {
  const [rows, setRows] = useState<TimesheetRow[]>([]);
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
  const [editingCell, setEditingCell] = useState<{ rowId: string; date: string } | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [newRowForm, setNewRowForm] = useState({
    type: 'project' as 'project' | 'initiation' | 'category',
    selectedId: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const fetchData = async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const [entriesRes, projectsRes, requestsRes, categoriesRes] = await Promise.all([
      supabase
        .from('timesheet_entries')
        .select('*')
        .gte('entry_date', currentWeekStart.toISOString().split('T')[0])
        .lte('entry_date', weekEnd.toISOString().split('T')[0]),
      supabase
        .from('projects')
        .select('id, name, state')
        .eq('state', 'active')
        .order('name'),
      supabase
        .from('project_initiation_requests')
        .select('id, project_name, status')
        .in('status', ['approved', 'in_progress'])
        .order('project_name'),
      supabase
        .from('non_project_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')
    ]);

    const entries = entriesRes.data || [];
    const projectsData = projectsRes.data || [];
    const requestsData = requestsRes.data || [];
    const categoriesData = categoriesRes.data || [];

    setProjects(projectsData);
    setInitiationRequests(requestsData);
    setCategories(categoriesData);

    const rowsMap = new Map<string, TimesheetRow>();

    entries.forEach((entry: TimesheetEntry) => {
      let rowKey = '';
      let rowName = '';
      let rowType: 'project' | 'initiation' | 'category' = 'project';
      let typeId = '';

      if (entry.project_id) {
        rowKey = `project-${entry.project_id}`;
        const project = projectsData.find((p: Project) => p.id === entry.project_id);
        rowName = project?.name || 'Unknown Project';
        rowType = 'project';
        typeId = entry.project_id;
      } else if (entry.initiation_request_id) {
        rowKey = `initiation-${entry.initiation_request_id}`;
        const request = requestsData.find((r: InitiationRequest) => r.id === entry.initiation_request_id);
        rowName = request?.project_name || 'Unknown Request';
        rowType = 'initiation';
        typeId = entry.initiation_request_id;
      } else if (entry.non_project_category_id) {
        rowKey = `category-${entry.non_project_category_id}`;
        const category = categoriesData.find((c: NonProjectCategory) => c.id === entry.non_project_category_id);
        rowName = category?.name || 'Unknown Category';
        rowType = 'category';
        typeId = entry.non_project_category_id;
      }

      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          id: rowKey,
          name: rowName,
          type: rowType,
          typeId: typeId,
          entries: {}
        });
      }

      const row = rowsMap.get(rowKey)!;
      const dateKey = entry.entry_date;

      if (!row.entries[dateKey]) {
        row.entries[dateKey] = { id: entry.id, billable: 0, nonBillable: 0, notes: entry.notes || '' };
      }

      if (entry.is_billable) {
        row.entries[dateKey].billable += parseFloat(entry.hours.toString());
      } else {
        row.entries[dateKey].nonBillable += parseFloat(entry.hours.toString());
      }

      if (entry.notes) {
        row.entries[dateKey].notes = entry.notes;
      }
    });

    setRows(Array.from(rowsMap.values()));
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

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleAddRow = async () => {
    if (!newRowForm.selectedId) {
      alert('Please select an item');
      return;
    }

    let exists = false;
    if (newRowForm.type === 'project') {
      exists = rows.some(r => r.type === 'project' && r.typeId === newRowForm.selectedId);
    } else if (newRowForm.type === 'initiation') {
      exists = rows.some(r => r.type === 'initiation' && r.typeId === newRowForm.selectedId);
    } else if (newRowForm.type === 'category') {
      exists = rows.some(r => r.type === 'category' && r.typeId === newRowForm.selectedId);
    }

    if (exists) {
      alert('This item is already in your timesheet');
      return;
    }

    setShowAddModal(false);
    setNewRowForm({ type: 'project', selectedId: '' });
    await fetchData();
  };

  const handleCellUpdate = async (row: TimesheetRow, date: Date, billable: number, nonBillable: number, notes: string) => {
    const dateKey = formatDateKey(date);
    const existingEntry = row.entries[dateKey];

    const totalHours = billable + nonBillable;

    if (totalHours === 0 && existingEntry) {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('entry_date', dateKey)
        .eq(row.type === 'project' ? 'project_id' : row.type === 'initiation' ? 'initiation_request_id' : 'non_project_category_id', row.typeId);

      if (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry');
      } else {
        await fetchData();
      }
      return;
    }

    if (totalHours > 0) {
      await supabase
        .from('timesheet_entries')
        .delete()
        .eq('entry_date', dateKey)
        .eq(row.type === 'project' ? 'project_id' : row.type === 'initiation' ? 'initiation_request_id' : 'non_project_category_id', row.typeId);

      const entriesToInsert = [];

      if (billable > 0) {
        entriesToInsert.push({
          entry_date: dateKey,
          hours: billable,
          is_billable: true,
          notes: notes,
          project_id: row.type === 'project' ? row.typeId : null,
          initiation_request_id: row.type === 'initiation' ? row.typeId : null,
          non_project_category_id: row.type === 'category' ? row.typeId : null
        });
      }

      if (nonBillable > 0) {
        entriesToInsert.push({
          entry_date: dateKey,
          hours: nonBillable,
          is_billable: false,
          notes: notes,
          project_id: row.type === 'project' ? row.typeId : null,
          initiation_request_id: row.type === 'initiation' ? row.typeId : null,
          non_project_category_id: row.type === 'category' ? row.typeId : null
        });
      }

      const { error } = await supabase
        .from('timesheet_entries')
        .insert(entriesToInsert);

      if (error) {
        console.error('Error saving entry:', error);
        alert('Error saving entry');
      } else {
        await fetchData();
      }
    }
  };

  const handleDeleteRow = async (row: TimesheetRow) => {
    if (!confirm(`Remove ${row.name} from timesheet? This will delete all time entries for this item.`)) {
      return;
    }

    const { error } = await supabase
      .from('timesheet_entries')
      .delete()
      .eq(
        row.type === 'project' ? 'project_id' : row.type === 'initiation' ? 'initiation_request_id' : 'non_project_category_id',
        row.typeId
      );

    if (error) {
      console.error('Error deleting entries:', error);
      alert('Error deleting entries');
    } else {
      await fetchData();
    }
  };

  const weekDates = getWeekDates();
  const totalsByDay = weekDates.map(date => {
    const dateKey = formatDateKey(date);
    let billable = 0;
    let nonBillable = 0;
    rows.forEach(row => {
      if (row.entries[dateKey]) {
        billable += row.entries[dateKey].billable;
        nonBillable += row.entries[dateKey].nonBillable;
      }
    });
    return { billable, nonBillable, total: billable + nonBillable };
  });

  const grandTotal = totalsByDay.reduce((sum, day) => sum + day.total, 0);

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
          <div className="text-2xl font-bold text-blue-600">{grandTotal.toFixed(2)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold">Project/Activity</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} className="text-center py-3 px-2 font-semibold min-w-[120px]">
                    <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-normal text-gray-600">{formatDate(date)}</div>
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-semibold">Total</th>
                <th className="text-center py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">
                    No time entries. Click "Add Time Entry" to get started.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row) => {
                    const rowTotal = weekDates.reduce((sum, date) => {
                      const dateKey = formatDateKey(date);
                      const entry = row.entries[dateKey];
                      return sum + (entry ? entry.billable + entry.nonBillable : 0);
                    }, 0);

                    return (
                      <tr key={row.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{row.name}</td>
                        {weekDates.map((date, idx) => {
                          const dateKey = formatDateKey(date);
                          const entry = row.entries[dateKey] || { billable: 0, nonBillable: 0, notes: '' };
                          const isEditing = editingCell?.rowId === row.id && editingCell?.date === dateKey;

                          return (
                            <td key={idx} className="py-2 px-2 text-center">
                              {isEditing ? (
                                <TimesheetCell
                                  billable={entry.billable}
                                  nonBillable={entry.nonBillable}
                                  notes={editingNotes}
                                  onSave={(billable, nonBillable, notes) => {
                                    handleCellUpdate(row, date, billable, nonBillable, notes);
                                    setEditingCell(null);
                                  }}
                                  onCancel={() => setEditingCell(null)}
                                />
                              ) : (
                                <div
                                  onClick={() => {
                                    setEditingCell({ rowId: row.id, date: dateKey });
                                    setEditingNotes(entry.notes);
                                  }}
                                  className="cursor-pointer hover:bg-gray-100 rounded p-2 min-h-[60px]"
                                >
                                  {entry.billable > 0 || entry.nonBillable > 0 ? (
                                    <div className="text-sm">
                                      {entry.billable > 0 && (
                                        <div className="text-green-700 font-medium">B: {entry.billable}</div>
                                      )}
                                      {entry.nonBillable > 0 && (
                                        <div className="text-gray-700">NB: {entry.nonBillable}</div>
                                      )}
                                      {entry.notes && (
                                        <div className="text-xs text-gray-500 mt-1 truncate" title={entry.notes}>
                                          {entry.notes}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-sm">-</div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-4 text-center font-semibold">{rowTotal.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteRow(row)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                    <td className="py-3 px-4">Daily Totals</td>
                    {totalsByDay.map((day, idx) => (
                      <td key={idx} className="py-3 px-2 text-center">
                        <div className="text-sm">
                          {day.billable > 0 && <div className="text-green-700">B: {day.billable.toFixed(2)}</div>}
                          {day.nonBillable > 0 && <div className="text-gray-700">NB: {day.nonBillable.toFixed(2)}</div>}
                          {day.total === 0 && <div className="text-gray-400">-</div>}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center text-blue-600">{grandTotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </>
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
                  Type
                </label>
                <select
                  value={newRowForm.type}
                  onChange={(e) => setNewRowForm({ type: e.target.value as any, selectedId: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="project">Active Project</option>
                  <option value="initiation">Project in Initiation</option>
                  <option value="category">Non-Project Work</option>
                </select>
              </div>

              {newRowForm.type === 'project' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={newRowForm.selectedId}
                    onChange={(e) => setNewRowForm({ ...newRowForm, selectedId: e.target.value })}
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

              {newRowForm.type === 'initiation' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initiation Request
                  </label>
                  <select
                    value={newRowForm.selectedId}
                    onChange={(e) => setNewRowForm({ ...newRowForm, selectedId: e.target.value })}
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

              {newRowForm.type === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newRowForm.selectedId}
                    onChange={(e) => setNewRowForm({ ...newRowForm, selectedId: e.target.value })}
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

              <p className="text-sm text-gray-600">
                After adding, click on any day cell to enter hours and notes.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewRowForm({ type: 'project', selectedId: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TimesheetCellProps {
  billable: number;
  nonBillable: number;
  notes: string;
  onSave: (billable: number, nonBillable: number, notes: string) => void;
  onCancel: () => void;
}

const TimesheetCell: React.FC<TimesheetCellProps> = ({ billable, nonBillable, notes, onSave, onCancel }) => {
  const [localBillable, setLocalBillable] = useState(billable.toString());
  const [localNonBillable, setLocalNonBillable] = useState(nonBillable.toString());
  const [localNotes, setLocalNotes] = useState(notes);

  const handleSave = () => {
    const b = parseFloat(localBillable) || 0;
    const nb = parseFloat(localNonBillable) || 0;
    onSave(b, nb, localNotes);
  };

  return (
    <div className="bg-white border-2 border-blue-500 rounded p-2 shadow-lg min-w-[200px]">
      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-600">Billable</label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={localBillable}
            onChange={(e) => setLocalBillable(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Non-Billable</label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={localNonBillable}
            onChange={(e) => setLocalNonBillable(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Notes</label>
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            rows={2}
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
          >
            <Save className="w-3 h-3 mx-auto" />
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
          >
            <X className="w-3 h-3 mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Timesheet;
