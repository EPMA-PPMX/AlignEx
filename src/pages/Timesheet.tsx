import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle, Send, RotateCcw, ChevronDown, ChevronUp, FileText, X } from 'lucide-react';

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
  persistentItemId?: string;
  isCompleted?: boolean;
}

interface TimesheetSubmission {
  id: string;
  user_email: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  submitted_at: string;
  recalled_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
}

const Timesheet: React.FC = () => {
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [addedRows, setAddedRows] = useState<TimesheetRow[]>([]);
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
  const [newRowForm, setNewRowForm] = useState({
    type: 'project' as 'project' | 'initiation' | 'category',
    selectedId: ''
  });
  const [weekSubmission, setWeekSubmission] = useState<TimesheetSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [notesModal, setNotesModal] = useState<{
    show: boolean;
    row: TimesheetRow | null;
    date: Date | null;
    isBillable: boolean;
    notes: string;
  }>({
    show: false,
    row: null,
    date: null,
    isBillable: false,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentWeekStart]);

  const fetchData = async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const USER_EMAIL = 'demo@alignex.com';

    const [entriesRes, projectsRes, requestsRes, categoriesRes, persistentItemsRes, submissionRes] = await Promise.all([
      supabase
        .from('timesheet_entries')
        .select('*')
        .gte('entry_date', currentWeekStart.toISOString().split('T')[0])
        .lte('entry_date', weekEnd.toISOString().split('T')[0]),
      supabase
        .from('projects')
        .select('id, name, state')
        .order('name'),
      supabase
        .from('project_initiation_requests')
        .select('id, project_name, status')
        .order('project_name'),
      supabase
        .from('non_project_work_categories')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('user_timesheet_items')
        .select('*')
        .eq('user_email', USER_EMAIL)
        .eq('is_completed', false),
      supabase
        .from('timesheet_submissions')
        .select('*')
        .eq('user_email', USER_EMAIL)
        .eq('week_start_date', currentWeekStart.toISOString().split('T')[0])
        .maybeSingle()
    ]);

    const entries = entriesRes.data || [];
    const projectsData = projectsRes.data || [];
    const requestsData = requestsRes.data || [];
    const categoriesData = categoriesRes.data || [];
    const persistentItems = persistentItemsRes.data || [];
    const submission = submissionRes.data;

    setProjects(projectsData);
    setInitiationRequests(requestsData);
    setCategories(categoriesData);
    setWeekSubmission(submission || null);

    const rowsMap = new Map<string, TimesheetRow>();

    // First, add all persistent items as rows
    persistentItems.forEach((item: any) => {
      let rowKey = '';
      let rowName = '';
      let rowType: 'project' | 'initiation' | 'category' = 'project';
      let typeId = '';

      if (item.project_id) {
        rowKey = `project-${item.project_id}`;
        const project = projectsData.find((p: Project) => p.id === item.project_id);
        rowName = project?.name || 'Unknown Project';
        rowType = 'project';
        typeId = item.project_id;
      } else if (item.initiation_request_id) {
        rowKey = `initiation-${item.initiation_request_id}`;
        const request = requestsData.find((r: InitiationRequest) => r.id === item.initiation_request_id);
        rowName = request?.project_name || 'Unknown Request';
        rowType = 'initiation';
        typeId = item.initiation_request_id;
      } else if (item.non_project_category_id) {
        rowKey = `category-${item.non_project_category_id}`;
        const category = categoriesData.find((c: NonProjectCategory) => c.id === item.non_project_category_id);
        rowName = category?.name || 'Unknown Category';
        rowType = 'category';
        typeId = item.non_project_category_id;
      }

      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          id: rowKey,
          name: rowName,
          type: rowType,
          typeId: typeId,
          entries: {},
          persistentItemId: item.id,
          isCompleted: false
        });
      }
    });

    // Then, populate entries for the week
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

    const allRows = Array.from(rowsMap.values());
    setRows(allRows);
    setAddedRows([]);
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

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  const handleAddRow = async () => {
    if (!newRowForm.selectedId) {
      alert('Please select an item');
      return;
    }

    const USER_EMAIL = 'demo@alignex.com';

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

    try {
      // Save to user_timesheet_items table
      const itemData: any = {
        user_email: USER_EMAIL,
        item_type: newRowForm.type,
        is_completed: false,
        project_id: null,
        initiation_request_id: null,
        non_project_category_id: null
      };

      if (newRowForm.type === 'project') {
        itemData.project_id = newRowForm.selectedId;
      } else if (newRowForm.type === 'initiation') {
        itemData.initiation_request_id = newRowForm.selectedId;
      } else {
        itemData.non_project_category_id = newRowForm.selectedId;
      }

      const { error } = await supabase
        .from('user_timesheet_items')
        .insert([itemData]);

      if (error) {
        console.error('Error adding timesheet item:', error);
        alert('Error adding item to timesheet');
        return;
      }

      // Reload data to show the new item
      await fetchData();
      setShowAddModal(false);
      setNewRowForm({ type: 'project', selectedId: '' });
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleMarkAsCompleted = async (row: TimesheetRow) => {
    if (!row.persistentItemId) {
      alert('This item cannot be marked as completed');
      return;
    }

    if (!confirm(`Mark "${row.name}" as completed? It will be removed from your timesheet.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_timesheet_items')
        .update({
          is_completed: true,
          completed_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', row.persistentItemId);

      if (error) {
        console.error('Error marking item as completed:', error);
        alert('Error marking item as completed');
        return;
      }

      // Reload data to remove the completed item
      await fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSubmitTimesheet = async () => {
    const USER_EMAIL = 'demo@alignex.com';
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (rows.length === 0) {
      alert('No time entries to submit');
      return;
    }

    const weekDates = getWeekDates();
    let totalHours = 0;
    let billableHours = 0;
    let nonBillableHours = 0;

    rows.forEach(row => {
      weekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        const entry = row.entries[dateKey];
        if (entry) {
          totalHours += entry.billable + entry.nonBillable;
          billableHours += entry.billable;
          nonBillableHours += entry.nonBillable;
        }
      });
    });

    if (totalHours === 0) {
      alert('No hours to submit. Please add some time entries first.');
      return;
    }

    if (!confirm(`Submit timesheet for week of ${currentWeekStart.toLocaleDateString()}?\n\nTotal Hours: ${totalHours.toFixed(2)}\nBillable: ${billableHours.toFixed(2)}\nNon-Billable: ${nonBillableHours.toFixed(2)}`)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        user_email: USER_EMAIL,
        week_start_date: currentWeekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        status: 'submitted',
        total_hours: totalHours,
        billable_hours: billableHours,
        non_billable_hours: nonBillableHours,
        submitted_at: new Date().toISOString()
      };

      const { data: submission, error } = await supabase
        .from('timesheet_submissions')
        .upsert([submissionData], {
          onConflict: 'user_email,week_start_date'
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting timesheet:', error);
        alert('Error submitting timesheet');
        return;
      }

      alert('Timesheet submitted successfully!');
      await fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecallTimesheet = async () => {
    if (!weekSubmission) return;

    if (!confirm('Recall this timesheet? You will be able to edit and resubmit it.')) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('timesheet_submissions')
        .update({
          status: 'recalled',
          recalled_at: new Date().toISOString()
        })
        .eq('id', weekSubmission.id);

      if (error) {
        console.error('Error recalling timesheet:', error);
        alert('Error recalling timesheet');
        return;
      }

      alert('Timesheet recalled successfully. You can now edit and resubmit.');
      await fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenNotesModal = (row: TimesheetRow, date: Date, isBillable: boolean) => {
    const dateKey = formatDateKey(date);
    const existingEntry = row.entries[dateKey];
    const notes = existingEntry?.notes || '';

    setNotesModal({
      show: true,
      row,
      date,
      isBillable,
      notes
    });
  };

  const handleSaveNotes = async () => {
    if (!notesModal.row || !notesModal.date) return;

    const dateKey = formatDateKey(notesModal.date);
    const existingEntry = notesModal.row.entries[dateKey];

    if (!existingEntry || (existingEntry.billable === 0 && existingEntry.nonBillable === 0)) {
      alert('Please enter hours before adding notes.');
      return;
    }

    await supabase
      .from('timesheet_entries')
      .update({ notes: notesModal.notes })
      .eq('entry_date', dateKey)
      .eq(
        notesModal.row.type === 'project' ? 'project_id' :
        notesModal.row.type === 'initiation' ? 'initiation_request_id' :
        'non_project_category_id',
        notesModal.row.typeId
      );

    await fetchData();
    setNotesModal({
      show: false,
      row: null,
      date: null,
      isBillable: false,
      notes: ''
    });
  };

  const handleCellUpdate = async (row: TimesheetRow, date: Date, isBillable: boolean, hours: number) => {
    if (weekSubmission && weekSubmission.status === 'submitted') {
      return;
    }

    const dateKey = formatDateKey(date);
    const existingEntry = row.entries[dateKey];

    const billable = isBillable ? hours : (existingEntry?.billable || 0);
    const nonBillable = !isBillable ? hours : (existingEntry?.nonBillable || 0);
    const notes = existingEntry?.notes || '';

    const totalHours = billable + nonBillable;

    if (totalHours === 0 && existingEntry) {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('entry_date', dateKey)
        .eq(row.type === 'project' ? 'project_id' : row.type === 'initiation' ? 'initiation_request_id' : 'non_project_category_id', row.typeId);

      if (error) {
        console.error('Error deleting entry:', error);
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
          user_id: 'anonymous',
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
          user_id: 'anonymous',
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
  const totalBillable = totalsByDay.reduce((sum, day) => sum + day.billable, 0);
  const totalNonBillable = totalsByDay.reduce((sum, day) => sum + day.nonBillable, 0);

  const nonProjectHours = rows.reduce((sum, row) => {
    if (row.type === 'category') {
      weekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (row.entries[dateKey]) {
          sum += row.entries[dateKey].billable + row.entries[dateKey].nonBillable;
        }
      });
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timesheet</h1>
          <p className="text-gray-600 mt-1">Track time for projects and activities</p>
        </div>
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

        <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-2xl font-bold text-blue-600">{grandTotal.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-gray-600">Billable</div>
            <div className="text-2xl font-bold text-green-600">{totalBillable.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Non-Billable</div>
            <div className="text-2xl font-bold text-gray-600">{totalNonBillable.toFixed(2)}</div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600">Non-Project</div>
            <div className="text-2xl font-bold text-orange-600">{nonProjectHours.toFixed(2)}</div>
          </div>
          {weekSubmission && (
            <div className={`p-4 rounded-lg ${
              weekSubmission.status === 'submitted' ? 'bg-green-50' :
              weekSubmission.status === 'approved' ? 'bg-green-100' :
              weekSubmission.status === 'rejected' ? 'bg-red-50' :
              'bg-gray-50'
            }`}>
              <div className="text-sm text-gray-600">Status</div>
              <div className={`text-2xl font-bold ${
                weekSubmission.status === 'submitted' ? 'text-green-700' :
                weekSubmission.status === 'approved' ? 'text-green-800' :
                weekSubmission.status === 'rejected' ? 'text-red-700' :
                'text-gray-700'
              }`}>
                {weekSubmission.status.charAt(0).toUpperCase() + weekSubmission.status.slice(1)}
              </div>
              {weekSubmission.submitted_at && (
                <div className="text-xs text-gray-500 mt-1">
                  Submitted: {new Date(weekSubmission.submitted_at).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-4 flex justify-end gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            disabled={weekSubmission && weekSubmission.status === 'submitted'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add Time Entry
          </button>
          {weekSubmission && weekSubmission.status === 'submitted' ? (
            <button
              onClick={handleRecallTimesheet}
              disabled={isSubmitting}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-5 h-5" />
              Recall Timesheet
            </button>
          ) : (
            <button
              onClick={handleSubmitTimesheet}
              disabled={isSubmitting || rows.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              Submit Timesheet
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-semibold w-56">Project/Activity</th>
                <th className="text-left py-3 px-2 font-semibold w-24">Type</th>
                {weekDates.map((date, idx) => (
                  <th key={idx} className="text-center py-3 px-2 font-semibold min-w-[80px]">
                    <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-sm font-normal text-gray-600">{formatDate(date)}</div>
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-semibold w-20">Total</th>
                <th className="text-center py-3 px-4 font-semibold w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No time entries. Click "Add Time Entry" to get started.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row, rowIdx) => {
                    const billableTotal = weekDates.reduce((sum, date) => {
                      const dateKey = formatDateKey(date);
                      const entry = row.entries[dateKey];
                      return sum + (entry?.billable || 0);
                    }, 0);

                    const nonBillableTotal = weekDates.reduce((sum, date) => {
                      const dateKey = formatDateKey(date);
                      const entry = row.entries[dateKey];
                      return sum + (entry?.nonBillable || 0);
                    }, 0);

                    const rowTotal = billableTotal + nonBillableTotal;
                    const isExpanded = expandedRows.has(row.id);

                    return (
                      <React.Fragment key={row.id}>
                        <tr className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b ${isExpanded ? 'border-gray-200' : 'border-gray-300'}`}>
                          <td className="py-2 px-4" rowSpan={isExpanded ? 2 : 1}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleRowExpansion(row.id)}
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-1"
                                title={isExpanded ? "Hide Non-Billable" : "Show Non-Billable"}
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <span className="font-medium">{row.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-sm font-medium text-green-700">Billable</span>
                          </td>
                          {weekDates.map((date, idx) => {
                            const dateKey = formatDateKey(date);
                            const entry = row.entries[dateKey];
                            const value = entry?.billable || 0;
                            const isLocked = weekSubmission && weekSubmission.status === 'submitted';

                            return (
                              <td key={idx} className="py-2 px-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    value={value || ''}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                      const newValue = parseFloat(e.target.value) || 0;
                                      handleCellUpdate(row, date, true, newValue);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Tab') {
                                        // Tab key navigation handled by browser
                                      } else if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        if (isExpanded) {
                                          const nextInput = e.currentTarget.parentElement?.parentElement?.parentElement?.nextElementSibling?.children[idx + 1]?.querySelector('input') as HTMLInputElement;
                                          nextInput?.focus();
                                        } else {
                                          const nextInput = e.currentTarget.parentElement?.parentElement?.parentElement?.nextElementSibling?.children[idx + 2]?.querySelector('input') as HTMLInputElement;
                                          nextInput?.focus();
                                        }
                                      } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        if (isExpanded) {
                                          const prevRow = e.currentTarget.parentElement?.parentElement?.parentElement?.previousElementSibling?.previousElementSibling?.children[idx + 2]?.querySelector('input') as HTMLInputElement;
                                          prevRow?.focus();
                                        } else {
                                          const prevRow = e.currentTarget.parentElement?.parentElement?.parentElement?.previousElementSibling?.children[idx + 2]?.querySelector('input') as HTMLInputElement;
                                          prevRow?.focus();
                                        }
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    placeholder="0"
                                  />
                                  <button
                                    onClick={() => handleOpenNotesModal(row, date, true)}
                                    disabled={isLocked}
                                    className={`flex-shrink-0 p-1 rounded transition-colors ${
                                      entry?.notes ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={entry?.notes ? 'Edit notes' : 'Add notes'}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-center text-sm font-semibold" rowSpan={isExpanded ? 2 : 1}>{rowTotal.toFixed(2)}</td>
                          <td className="py-2 px-4 text-center" rowSpan={isExpanded ? 2 : 1}>
                            {row.persistentItemId ? (
                              <button
                                onClick={() => handleMarkAsCompleted(row)}
                                disabled={weekSubmission && weekSubmission.status === 'submitted'}
                                className="text-green-600 hover:text-green-800 flex items-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-green-600"
                                title="Mark as Completed"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteRow(row)}
                                disabled={weekSubmission && weekSubmission.status === 'submitted'}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-red-600"
                                title="Remove from this week"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className={`${rowIdx % 2 === 0 ? 'bg-gray-50' : 'bg-gray-100'} border-b border-gray-300`}>
                            <td className="py-2 px-2">
                              <span className="text-sm font-medium text-gray-600 italic">Non-Billable</span>
                            </td>
                            {weekDates.map((date, idx) => {
                              const dateKey = formatDateKey(date);
                              const entry = row.entries[dateKey];
                              const value = entry?.nonBillable || 0;
                              const isLocked = weekSubmission && weekSubmission.status === 'submitted';

                              return (
                                <td key={idx} className="py-2 px-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="0.25"
                                      min="0"
                                      value={value || ''}
                                      disabled={isLocked}
                                      onChange={(e) => {
                                        const newValue = parseFloat(e.target.value) || 0;
                                        handleCellUpdate(row, date, false, newValue);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Tab') {
                                          // Tab key navigation handled by browser
                                        } else if (e.key === 'ArrowDown') {
                                          e.preventDefault();
                                          const nextInput = e.currentTarget.parentElement?.parentElement?.parentElement?.nextElementSibling?.children[idx + 2]?.querySelector('input') as HTMLInputElement;
                                          nextInput?.focus();
                                        } else if (e.key === 'ArrowUp') {
                                          e.preventDefault();
                                          const prevInput = e.currentTarget.parentElement?.parentElement?.parentElement?.previousElementSibling?.children[idx + 2]?.querySelector('input') as HTMLInputElement;
                                          prevInput?.focus();
                                        }
                                      }}
                                      className="w-full px-2 py-1 text-center border border-gray-200 rounded focus:border-gray-400 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed bg-gray-100 text-gray-600"
                                      placeholder="0"
                                    />
                                    <button
                                      onClick={() => handleOpenNotesModal(row, date, false)}
                                      disabled={isLocked}
                                      className={`flex-shrink-0 p-1 rounded transition-colors ${
                                        entry?.notes ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-400 hover:bg-gray-100'
                                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                                      title={entry?.notes ? 'Edit notes' : 'Add notes'}
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="border-t-2 border-gray-300">
                    <td className="py-3 px-4 font-semibold" colSpan={2}>Daily Totals</td>
                    {totalsByDay.map((day, idx) => (
                      <td key={idx} className="py-3 px-2 text-center">
                        <div className="text-sm font-semibold text-blue-600">
                          {day.total > 0 ? day.total.toFixed(2) : '-'}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center text-lg font-bold text-blue-600">{grandTotal.toFixed(2)}</td>
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

      {notesModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Time Entry Notes</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {notesModal.row?.name} - {notesModal.date ? formatDate(notesModal.date) : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesModal({ show: false, row: null, date: null, isBillable: false, notes: '' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notesModal.notes}
                  onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter notes for this time entry..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Add any relevant details about the work performed during this time period.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setNotesModal({ show: false, row: null, date: null, isBillable: false, notes: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
