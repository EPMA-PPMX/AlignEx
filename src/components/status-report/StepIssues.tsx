import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepIssues({ reportData, updateReportData }: Props) {
  const [issues, setIssues] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    issue_id: null,
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    impact: '',
    is_new: true,
  });

  useEffect(() => {
    if (reportData.projectId) {
      loadProjectIssues();
    }
  }, [reportData.projectId]);

  useEffect(() => {
    if (reportData.issues.length > 0) {
      setIssues(reportData.issues);
    }
  }, []);

  const loadProjectIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('project_issues')
        .select('*')
        .eq('project_id', reportData.projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const existingIssues = (data || []).map((issue) => ({
        issue_id: issue.id,
        title: issue.title,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        impact: issue.impact || '',
        is_new: false,
      }));

      setIssues(existingIssues);
      updateReportData('issues', existingIssues);
    } catch (error) {
      console.error('Error loading issues:', error);
    }
  };

  const handleAdd = () => {
    const newIssues = [...issues, formData];
    setIssues(newIssues);
    updateReportData('issues', newIssues);
    resetForm();
  };

  const handleUpdate = () => {
    const newIssues = [...issues];
    newIssues[editingIndex!] = formData;
    setIssues(newIssues);
    updateReportData('issues', newIssues);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const newIssues = issues.filter((_, i) => i !== index);
    setIssues(newIssues);
    updateReportData('issues', newIssues);
  };

  const handleEdit = (index: number) => {
    setFormData(issues[index]);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      issue_id: null,
      title: '',
      description: '',
      severity: 'medium',
      status: 'open',
      impact: '',
      is_new: true,
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
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
        <p className="text-gray-600">Review and update issues for this week</p>
      </div>

      <div className="space-y-4">
        {issues.map((issue, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{issue.title}</h4>
                  {issue.is_new && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-200">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-200">
                    {issue.status}
                  </span>
                </div>
                {issue.impact && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Impact:</strong> {issue.impact}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(index)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(index)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {issues.length === 0 && (
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
            Add {issues.length === 0 ? 'First' : 'New'} Issue
          </button>
        )}

        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {editingIndex !== null ? 'Edit Issue' : 'Add New Issue'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
              <textarea
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingIndex !== null ? handleUpdate : handleAdd}
                disabled={!formData.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editingIndex !== null ? 'Update' : 'Add'} Issue
              </button>
              <button onClick={resetForm} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
