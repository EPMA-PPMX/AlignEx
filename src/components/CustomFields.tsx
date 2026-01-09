import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  description?: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
  entity_type: 'project' | 'resource' | 'task';
  created_at: string;
  updated_at: string;
}

const CustomFields: React.FC = () => {
  const { showConfirm } = useNotification();
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [optionsList, setOptionsList] = useState<string[]>(['']);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text',
    field_label: '',
    description: '',
    is_required: false,
    default_value: '',
    entity_type: 'project' as 'project' | 'resource' | 'task',
    //entity_type: 'project' as 'project' | 'resource',
    track_history: false,
    options: []
  });

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'cost', label: 'Cost' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Date' },
    { value: 'textarea', label: 'Multiline Text' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Button' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'people_picker', label: 'People Picker' }
  ];

  useEffect(() => {
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching custom fields:', error);
      } else {
        setCustomFields(data || []);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.field_name || !formData.field_label) {
      alert('Field name and label are required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        options: ['dropdown', 'radio'].includes(formData.field_type) && formData.options.length > 0
          ? formData.options.filter(opt => opt.trim())
          : null
      };

      if (editingField) {
        const { error } = await supabase
          .from('custom_fields')
          .update(payload)
          .eq('id', editingField);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          await fetchCustomFields();
          resetForm();
          alert('Custom field updated successfully!');
        }
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert([payload]);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          await fetchCustomFields();
          resetForm();
          alert('Custom field created successfully!');
        }
      }
    } catch (error) {
      console.error('Error saving custom field:', error);
      alert('Error saving custom field');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field.id);
    const fieldOptions = field.options || [];
    setOptionsList(fieldOptions.length > 0 ? fieldOptions : ['']);
    setFormData({
      field_name: field.field_name,
      field_type: field.field_type,
      field_label: field.field_label,
      description: field.description || '',
      is_required: field.is_required,
      default_value: field.default_value || '',
      entity_type: field.entity_type,
      track_history: field.track_history || false,
      options: fieldOptions
    });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Custom Field',
      message: 'Are you sure you want to delete this custom field?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        await fetchCustomFields();
        alert('Custom field deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting custom field:', error);
      alert('Error deleting custom field');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setOptionsList(['']);
    setFormData({
      field_name: '',
      field_type: 'text',
      field_label: '',
      description: '',
      is_required: false,
      default_value: '',
      entity_type: 'project',
      track_history: false,
      options: []
    });
    setEditingField(null);
  };

  const addOption = () => {
    setOptionsList([...optionsList, '']);
  };

  const removeOption = (index: number) => {
    if (optionsList.length > 1) {
      const newOptions = optionsList.filter((_, i) => i !== index);
      setOptionsList(newOptions);
      setFormData({ ...formData, options: newOptions.filter(opt => opt.trim()) });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...optionsList];
    newOptions[index] = value;
    setOptionsList(newOptions);
    setFormData({ ...formData, options: newOptions.filter(opt => opt.trim()) });
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
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Custom Fields</h2>
      
      {/* Form */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.field_name}
                onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., project_priority"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.field_type}
                onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Applies To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.entity_type}
                onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as 'project' | 'resource' | 'task' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="project">Project Fields</option>
                <option value="resource">Resource Fields</option>
                <option value="task">Task Fields</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.field_label}
              onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Select the priority level for this project"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Help Text
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional guidance for users filling this field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Value
              </label>
              <input
                type="text"
                value={formData.default_value}
                onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional default value"
              />
            </div>

            {['dropdown', 'radio'].includes(formData.field_type) && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  {optionsList.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${index + 1}`}
                      />
                      {optionsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Option</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_required" className="ml-2 block text-sm text-gray-700">
                Required field
              </label>
            </div>

            {formData.entity_type === 'project' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="track_history"
                  checked={formData.track_history}
                  onChange={(e) => setFormData({ ...formData, track_history: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="track_history" className="ml-2 block text-sm text-gray-700">
                  Track historical values
                </label>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{editingField ? 'Update Field' : 'Create Field'}</span>
            </button>
            
            {editingField && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Custom Fields Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Existing Custom Fields</h3>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : customFields.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No custom fields created yet. Create your first custom field above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Field Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applies To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Options
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
                {customFields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.field_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {field.field_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        field.entity_type === 'project'
                          ? 'bg-blue-100 text-blue-800'
                          : field.entity_type === 'resource'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {field.entity_type === 'project' ? 'Project' : field.entity_type === 'resource' ? 'Resource' : 'Task'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {field.field_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {field.is_required ? (
                        <span className="text-red-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {field.default_value || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.options && field.options.length > 0 ? (
                        <div className="max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {field.options.slice(0, 3).map((option, idx) => (
                              <span key={idx} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {option}
                              </span>
                            ))}
                            {field.options.length > 3 && (
                              <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                +{field.options.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(field.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(field)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(field.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete"
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

export default CustomFields;