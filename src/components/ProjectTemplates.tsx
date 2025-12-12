import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';

interface ProjectTemplate {
  id: string;
  template_name: string;
  template_description?: string;
  start_date?: string | null;
  created_at: string;
  updated_at: string;
}

const ProjectTemplates: React.FC = () => {
  const { showConfirm } = useNotification();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    template_name: '',
    template_description: '',
    start_date: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project types:', error);
        alert('Error loading project types: ' + error.message);
      } else {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error fetching project types:', error);
      alert('Error loading project types. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.template_name.trim()) {
      alert('Template name is required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        template_name: formData.template_name.trim(),
        template_description: formData.template_description.trim() || null,
        start_date: formData.start_date || null
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('project_templates')
          .update(payload)
          .eq('id', editingTemplate);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          await fetchTemplates();
          resetForm();
          alert('Project type updated successfully!');
        }
      } else {
        const { error } = await supabase
          .from('project_templates')
          .insert([payload]);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          await fetchTemplates();
          resetForm();
          alert('Project type created successfully!');
        }
      }
    } catch (error) {
      console.error('Error saving project type:', error);
      alert('Error saving project type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: ProjectTemplate) => {
    setEditingTemplate(template.id);
    setFormData({
      template_name: template.template_name,
      template_description: template.template_description || '',
      start_date: template.start_date || ''
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Project Type',
      message: 'Are you sure you want to delete this project type?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        await fetchTemplates();
        alert('Project type deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting project type:', error);
      alert('Error deleting project type');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_description: '',
      start_date: ''
    });
    setEditingTemplate(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Project Types</h2>
      
      {/* Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Website Development"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Start Date
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Type Description
              </label>
              <textarea
                value={formData.template_description}
                onChange={(e) => setFormData({ ...formData, template_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                placeholder="Describe what this project type is for..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading || !formData.template_name.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{editingTemplate ? 'Update Project Type' : 'Create Project Type'}</span>
            </button>
            
            {editingTemplate && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Existing Project Types</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No project types created yet. Create your first project type above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {template.template_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate">
                        {template.template_description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {template.start_date
                        ? new Date(template.start_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(template.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit"
                          disabled={loading}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectTemplates;