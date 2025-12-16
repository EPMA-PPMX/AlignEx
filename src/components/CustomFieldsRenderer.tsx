import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PeoplePicker from './PeoplePicker';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  description?: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
  display_order?: number;
  section?: string;
}

interface CustomFieldValue {
  field_id: string;
  value: string;
}

interface CustomFieldsRendererProps {
  entityType: 'risk' | 'issue' | 'change_request';
  entityId?: string;
  section?: string;
  values: Record<string, string>;
  onChange: (fieldName: string, value: string) => void;
  readOnly?: boolean;
}

const CustomFieldsRenderer: React.FC<CustomFieldsRendererProps> = ({
  entityType,
  entityId,
  section,
  values,
  onChange,
  readOnly = false
}) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomFields();
  }, [entityType, section]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', entityType)
        .order('display_order', { ascending: true });

      if (section) {
        query = query.eq('section', section);
      }

      const { data, error } = await query;

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

  const renderField = (field: CustomField) => {
    const value = values[field.field_name] || field.default_value || '';

    if (readOnly) {
      return (
        <div key={field.id} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            {field.field_label}
            {field.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <p className="text-sm text-gray-900">
            {value || <span className="text-gray-400 italic">Not set</span>}
          </p>
          {field.description && (
            <p className="text-xs text-gray-500">{field.description}</p>
          )}
        </div>
      );
    }

    const commonProps = {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        onChange(field.field_name, e.target.value),
      className: "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      required: field.is_required
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.field_type}
              {...commonProps}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'number':
      case 'cost':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              step={field.field_type === 'cost' ? '0.01' : 'any'}
              {...commonProps}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              {...commonProps}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              rows={4}
              {...commonProps}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select {...commonProps}>
              <option value="">Select an option</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={field.field_name}
                    value={option}
                    checked={value === option}
                    onChange={(e) => onChange(field.field_name, e.target.value)}
                    required={field.is_required}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-1">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={value === 'true' || value === '1'}
                onChange={(e) => onChange(field.field_name, e.target.checked ? 'true' : 'false')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                {field.field_label}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 ml-6">{field.description}</p>
            )}
          </div>
        );

      case 'people_picker':
        return (
          <div key={field.id} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <PeoplePicker
              selectedPersonId={value}
              onSelect={(personId) => onChange(field.field_name, personId || '')}
              placeholder={`Select ${field.field_label.toLowerCase()}`}
            />
            {field.description && (
              <p className="text-xs text-gray-500">{field.description}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        Loading custom fields...
      </div>
    );
  }

  if (customFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {customFields.map(field => renderField(field))}
    </div>
  );
};

export default CustomFieldsRenderer;
