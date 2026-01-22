import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

interface Issue {
  id: string;
  project_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category?: string;
  owner?: string;
  assigned_to?: string;
  resolution?: string;
}

export default function StepIssues({ reportData, updateReportData }: Props) {
  const { showConfirm } = useNotification();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'Active',
  });

  useEffect(() => {
    if (reportData.projectId) {
      loadProjectIssues();
    }
  }, [reportData.projectId]);

  const loadProjectIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('project_issues')
        .select('*')
        .eq('project_id', reportData.projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const handleUpdateIssue = async (issueId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('project_issues')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', issueId);

      if (error) throw error;

      setIssues(issues.map(issue =>
        issue.id === issueId ? { ...issue, [field]: value } : issue
      ));
    } catch (error) {
      console.error('Error updating issue:', error);
      alert('Failed to update issue. Please try again.');
    }
  };

  const handleAddIssue = async () => {
    if (!newIssue.title.trim()) {
      alert('Please enter an issue title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_issues')
        .insert({
          project_id: reportData.projectId,
          ...newIssue,
        })
        .select()
        .single();

      if (error) throw error;

      setIssues([data, ...issues]);
      setNewIssue({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'Active',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding issue:', error);
      alert('Failed to add issue. Please try again.');
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Issue',
      message: 'Are you sure you want to delete this issue?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_issues')
        .delete()
        .eq('id', issueId);

      if (error) throw error;
      setIssues(issues.filter(issue => issue.id !== issueId));
    } catch (error) {
      console.error('Error deleting issue:', error);
      alert('Failed to delete issue. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Issues</h2>
        <p className="text-gray-600">Review and update issues - changes are saved immediately</p>
      </div>

      <div className="space-y-4">
        {issues.map((issue) => (
          <div key={issue.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={issue.title}
                    onChange={(e) => handleUpdateIssue(issue.id, 'title', e.target.value)}
                    className="w-full font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 -ml-2"
                    placeholder="Issue title"
                  />
                </div>
                <button
                  onClick={() => handleDeleteIssue(issue.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={issue.description || ''}
                onChange={(e) => handleUpdateIssue(issue.id, 'description', e.target.value)}
                className="w-full text-sm text-gray-600 border border-gray-200 rounded px-3 py-2 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Issue description"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={issue.priority}
                    onChange={(e) => handleUpdateIssue(issue.id, 'priority', e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded border font-medium ${getPriorityColor(issue.priority)}`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={issue.status}
                    onChange={(e) => handleUpdateIssue(issue.id, 'status', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded border border-gray-200 font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        ))}

        {issues.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No issues found for this project</p>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" />
            Add New Issue
          </button>
        )}

        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add New Issue</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter issue title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newIssue.description}
                onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the issue"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newIssue.priority}
                  onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newIssue.status}
                  onChange={(e) => setNewIssue({ ...newIssue, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddIssue}
                disabled={!newIssue.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Issue
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewIssue({
                    title: '',
                    description: '',
                    priority: 'Medium',
                    status: 'Active',
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
