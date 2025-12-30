import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  description?: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
  entity_type: string;
  display_order?: number;
  section?: string;
  created_at: string;
  updated_at: string;
}

interface FormFieldsManagementProps {
  entityType: 'risk' | 'issue' | 'change_request';
  title: string;
  description: string;
}

const FormFieldsManagement: React.FC<FormFieldsManagementProps> = ({ entityType, title, description }) => {
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
    entity_type: entityType,
    options: [] as string[],
    display_order: 0,
    section: 'general'
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

  const sections = [
    { value: 'general', label: 'General Information' },
    { value: 'details', label: 'Details' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'tracking', label: 'Tracking' },
    { value: 'custom', label: 'Custom Section' }
  ];

  useEffect(() => {
    fetchCustomFields();
  }, [entityType]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', entityType)
        .order('display_order', { ascending: true });

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
        entity_type: entityType,
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
          console.error('Error updating custom field:', error);
          alert('Failed to update field');
        }
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert([payload]);

        if (error) {
          console.error('Error creating custom field:', error);
          alert('Failed to create field');
        }
      }

      resetForm();
      fetchCustomFields();
    } catch (error) {
      console.error('Error saving custom field:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field.id);
    setFormData({
      field_name: field.field_name,
      field_type: field.field_type,
      field_label: field.field_label,
      description: field.description || '',
      is_required: field.is_required,
      default_value: field.default_value || '',
      entity_type: field.entity_type,
      options: field.options || [],
      display_order: field.display_order || 0,
      section: field.section || 'general'
    });
    if (field.options && field.options.length > 0) {
      setOptionsList(field.options);
    }
  };

  const handleDelete = async (fieldId: string) => {
    const confirmed = await showConfirm(
      'Delete Field',
      'Are you sure you want to delete this field? This action cannot be undone.'
    );

    if (confirmed) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('custom_fields')
          .delete()
          .eq('id', fieldId);

        if (error) {
          console.error('Error deleting custom field:', error);
          alert('Failed to delete field');
        } else {
          fetchCustomFields();
        }
      } catch (error) {
        console.error('Error deleting custom field:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      field_name: '',
      field_type: 'text',
      field_label: '',
      description: '',
      is_required: false,
      default_value: '',
      entity_type: entityType,
      options: [],
      display_order: 0,
      section: 'general'
    });
    setEditingField(null);
    setOptionsList(['']);
  };

  const handleAddOption = () => {
    setOptionsList([...optionsList, '']);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = optionsList.filter((_, i) => i !== index);
    setOptionsList(newOptions);
    setFormData({ ...formData, options: newOptions.filter(opt => opt.trim()) });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...optionsList];
    newOptions[index] = value;
    setOptionsList(newOptions);
    setFormData({ ...formData, options: newOptions.filter(opt => opt.trim()) });
  };

  const groupedFields = customFields.reduce((acc, field) => {
    const section = field.section || 'general';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, CustomField[]>);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.field_name}
              onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., mitigation_strategy"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Internal name (no spaces, lowercase)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.field_label}
              onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Mitigation Strategy"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Display name shown to users</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
            <select
              value={formData.field_type}
              onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select
              value={formData.section}
              onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {sections.map((section) => (
                <option key={section.value} value={section.value}>
                  {section.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Where to display this field in the form</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              placeholder="Optional description or help text"
            />
          </div>

          {['dropdown', 'radio'].includes(formData.field_type) && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              {optionsList.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Option
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Value</label>
            <input
              type="text"
              value={formData.default_value}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional default value"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Required Field</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{editingField ? 'Update Field' : 'Add Field'}</span>
          </button>
          {editingField && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900">Configured Fields</h4>

        {Object.keys(groupedFields).length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            No custom fields configured yet. Add your first field above.
          </div>
        ) : (
          Object.entries(groupedFields).map(([sectionKey, fields]) => (
            <div key={sectionKey} className="bg-white border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-3">
                {sections.find(s => s.value === sectionKey)?.label || sectionKey}
              </h5>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{field.field_label}</span>
                          {field.is_required && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span className="bg-gray-200 px-2 py-0.5 rounded">{field.field_type}</span>
                          <span>{field.field_name}</span>
                          {field.description && <span>• {field.description}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(field)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit field"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FormFieldsManagement;
