import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, Circle, Pause, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrencyInput, extractNumericValue } from '../../lib/utils';
import { useNotification } from '../../lib/useNotification';

interface Priority {
  id: string;
  title: string;
  description: string;
  target_value: string;
  owner: string;
  status: 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
}

export default function StrategicPriorities() {
  const { showConfirm } = useNotification();
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_value: '',
    owner: '',
    status: 'Active' as Priority['status'],
  });

  useEffect(() => {
    fetchPriorities();
  }, []);

  const fetchPriorities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizational_priorities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPriorities(data || []);
    } catch (error) {
      console.error('Error fetching priorities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from('organizational_priorities')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organizational_priorities')
          .insert([formData]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        target_value: '',
        owner: '',
        status: 'Active',
      });
      fetchPriorities();
    } catch (error) {
      console.error('Error saving priority:', error);
    }
  };

  const handleEdit = (priority: Priority) => {
    setEditingId(priority.id);
    setFormData({
      title: priority.title,
      description: priority.description || '',
      target_value: priority.target_value,
      owner: priority.owner,
      status: priority.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Priority',
      message: 'Are you sure you want to delete this priority?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organizational_priorities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPriorities();
    } catch (error) {
      console.error('Error deleting priority:', error);
    }
  };

  const getStatusIcon = (status: Priority['status']) => {
    switch (status) {
      case 'Active':
        return <Circle className="w-5 h-5 text-[#5DB6B8]" />;
      case 'Completed':
        return <CheckCircle className="w-5 h-5 text-[#4CAF50]" />;
      case 'On Hold':
        return <Pause className="w-5 h-5 text-[#F89D43]" />;
      case 'Cancelled':
        return <XCircle className="w-5 h-5 text-[#FD5D5D]" />;
      default:
        return <Circle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: Priority['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white border-[#5DB6B8]';
      case 'Completed':
        return 'bg-gradient-to-br from-[#66BB6A] to-[#81C784] text-white border-[#4CAF50]';
      case 'On Hold':
        return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white border-[#F89D43]';
      case 'Cancelled':
        return 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white border-[#FD5D5D]';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Loading priorities...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-600">
          Define and manage strategic priorities for the organization
        </p>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              title: '',
              description: '',
              target_value: '',
              owner: '',
              status: 'Active',
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Priority
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: '#F9F7FC' }} className="border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingId ? 'Edit Priority' : 'Create New Priority'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Reduce Operational Cost"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Detailed description of this strategic priority..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Value ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.target_value}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value);
                    setFormData({ ...formData, target_value: formatted });
                  }}
                  onBlur={(e) => {
                    if (e.target.value && !e.target.value.startsWith('$')) {
                      const formatted = formatCurrencyInput(e.target.value);
                      setFormData({ ...formData, target_value: formatted });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., $500,000"
                />
                <p className="text-xs text-slate-500 mt-1">Enter dollar amount only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Owner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Owner name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Priority['status'] })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingId ? 'Update Priority' : 'Create Priority'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {priorities.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">No strategic priorities defined yet.</p>
          <p className="text-sm text-slate-500 mt-1">Click "Add Priority" to create your first priority.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {priorities.map((priority) => (
            <div
              key={priority.id}
              style={{ backgroundColor: '#F9F7FC' }}
              className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(priority.status)}
                    <h3 className="text-lg font-semibold text-slate-900">{priority.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(priority.status)}`}>
                      {priority.status}
                    </span>
                  </div>

                  {priority.description && (
                    <p className="text-slate-600 mb-3">{priority.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Target:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {priority.target_value.startsWith('$')
                          ? priority.target_value
                          : `$${parseFloat(priority.target_value.replace(/[^0-9.-]/g, '') || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Owner:</span>
                      <span className="ml-2 font-medium text-slate-900">{priority.owner}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(priority)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Edit priority"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(priority.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete priority"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
