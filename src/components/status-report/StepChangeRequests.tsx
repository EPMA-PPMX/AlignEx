import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepChangeRequests({ reportData, updateReportData }: Props) {
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    change_request_id: null,
    title: '',
    description: '',
    status: 'pending',
    cost_impact: 0,
    schedule_impact: '',
    is_new: true,
  });

  useEffect(() => {
    if (reportData.projectId) {
      loadChangeRequests();
    }
  }, [reportData.projectId]);

  useEffect(() => {
    if (reportData.changeRequests.length > 0) {
      setChangeRequests(reportData.changeRequests);
    }
  }, []);

  const loadChangeRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', reportData.projectId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const existing = (data || []).map((cr) => ({
        change_request_id: cr.id,
        title: cr.title,
        description: cr.description,
        status: cr.status,
        cost_impact: cr.cost_impact || 0,
        schedule_impact: cr.schedule_impact || '',
        is_new: false,
      }));

      setChangeRequests(existing);
      updateReportData('changeRequests', existing);
    } catch (error) {
      console.error('Error loading change requests:', error);
    }
  };

  const handleAdd = () => {
    const newData = [...changeRequests, formData];
    setChangeRequests(newData);
    updateReportData('changeRequests', newData);
    resetForm();
  };

  const handleDelete = (index: number) => {
    const newData = changeRequests.filter((_, i) => i !== index);
    setChangeRequests(newData);
    updateReportData('changeRequests', newData);
  };

  const resetForm = () => {
    setFormData({
      change_request_id: null,
      title: '',
      description: '',
      status: 'pending',
      cost_impact: 0,
      schedule_impact: '',
      is_new: true,
    });
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Change Requests</h2>
        <p className="text-gray-600">Review pending change requests</p>
      </div>

      <div className="space-y-4">
        {changeRequests.map((cr, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{cr.title}</h4>
                  {cr.is_new && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-200">
                      New
                    </span>
                  )}
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded border border-yellow-200">
                    {cr.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{cr.description}</p>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span><strong>Cost Impact:</strong> ${cr.cost_impact?.toLocaleString() || 0}</span>
                  {cr.schedule_impact && <span><strong>Schedule:</strong> {cr.schedule_impact}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(index)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {changeRequests.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No pending change requests</p>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" />
            Add Change Request
          </button>
        )}

        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add New Change Request</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Impact ($)</label>
                <input
                  type="number"
                  value={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Impact</label>
                <input
                  type="text"
                  value={formData.schedule_impact}
                  onChange={(e) => setFormData({ ...formData, schedule_impact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., +2 weeks"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={!formData.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Change Request
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
