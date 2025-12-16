import React, { useState } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Save, X, GripVertical, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';

interface Section {
  id: string;
  name: string;
  isEditing: boolean;
  fields: SectionField[];
  isExpanded: boolean;
}

interface SectionField {
  id: string;
  customFieldId: string;
  customField: CustomField;
  order: number;
}

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
}

interface ProjectTemplate {
  id: string;
  template_name: string;
  template_description?: string;
}

const OverviewPageDesigner: React.FC = () => {
  const { showConfirm } = useNotification();
  const [sections, setSections] = useState<Section[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  React.useEffect(() => {
    fetchCustomFields();
    fetchProjectTemplates();
  }, []);

  React.useEffect(() => {
    if (selectedTemplate) {
      loadConfiguration();
    } else {
      setSections([]);
    }
  }, [selectedTemplate]);

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'project')
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

  const fetchProjectTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project templates:', error);
      } else {
        setProjectTemplates(data || []);
      }
    } catch (error) {
      console.error('Error fetching project templates:', error);
    }
  };

  const loadConfiguration = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('overview_configurations')
        .select('*')
        .eq('template_id', selectedTemplate)
        .maybeSingle();

      if (error) {
        console.error('Error loading configuration:', error);
        setSections([]);
      } else if (data && data.sections) {
        setSections(data.sections);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!selectedTemplate) {
      alert('Please select a project template first');
      return;
    }

    if (sections.length === 0) {
      alert('Please add at least one section before saving');
      return;
    }

    try {
      setSaving(true);

      const { data: existing } = await supabase
        .from('overview_configurations')
        .select('id')
        .eq('template_id', selectedTemplate)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('overview_configurations')
          .update({ sections })
          .eq('template_id', selectedTemplate);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          alert('Configuration updated successfully!');
        }
      } else {
        const { error } = await supabase
          .from('overview_configurations')
          .insert([{
            template_id: selectedTemplate,
            sections
          }]);

        if (error) {
          alert(`Error: ${error.message}`);
        } else {
          alert('Configuration saved successfully!');
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetConfiguration = async () => {
    const confirmed = await showConfirm({
      title: 'Reset Configuration',
      message: 'Are you sure you want to reset the configuration? This will clear all sections and fields.',
      confirmText: 'Reset'
    });
    if (!confirmed) return;

    setSections([]);
    setSelectedTemplate('');
  };

  const addSection = () => {
    const newSection: Section = {
      id: `section-${Date.now()}`,
      name: 'Rename Default Section Name',
      isEditing: false,
      fields: [],
      isExpanded: true,
    };
    setSections([...sections, newSection]);
  };

  const startEditing = (section: Section) => {
    setEditingSection(section.id);
    setEditName(section.name);
  };

  const saveEdit = (sectionId: string) => {
    if (editName.trim()) {
      setSections(sections.map(section => 
        section.id === sectionId 
          ? { ...section, name: editName.trim() }
          : section
      ));
    }
    setEditingSection(null);
    setEditName('');
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setEditName('');
  };

  const deleteSection = async (sectionId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Section',
      message: 'Are you sure you want to delete this section?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    setSections(sections.filter(section => section.id !== sectionId));
  };

  const moveSectionUp = (index: number) => {
    if (index > 0) {
      const newSections = [...sections];
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
      setSections(newSections);
    }
  };

  const moveSectionDown = (index: number) => {
    if (index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setSections(newSections);
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, isExpanded: !section.isExpanded }
        : section
    ));
  };

  const addFieldToSection = (sectionId: string, customFieldId: string) => {
    const customField = customFields.find(field => field.id === customFieldId);
    if (!customField) return;

    const newField: SectionField = {
      id: `field-${Date.now()}`,
      customFieldId,
      customField,
      order: 0,
    };

    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newFields = [...section.fields, newField];
        // Update order for all fields
        newFields.forEach((field, index) => {
          field.order = index;
        });
        return { ...section, fields: newFields };
      }
      return section;
    }));
  };

  const removeFieldFromSection = (sectionId: string, fieldId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newFields = section.fields.filter(field => field.id !== fieldId);
        // Update order for remaining fields
        newFields.forEach((field, index) => {
          field.order = index;
        });
        return { ...section, fields: newFields };
      }
      return section;
    }));
  };

  const moveFieldUp = (sectionId: string, fieldIndex: number) => {
    if (fieldIndex > 0) {
      setSections(sections.map(section => {
        if (section.id === sectionId) {
          const newFields = [...section.fields];
          [newFields[fieldIndex], newFields[fieldIndex - 1]] = [newFields[fieldIndex - 1], newFields[fieldIndex]];
          // Update order
          newFields.forEach((field, index) => {
            field.order = index;
          });
          return { ...section, fields: newFields };
        }
        return section;
      }));
    }
  };

  const moveFieldDown = (sectionId: string, fieldIndex: number) => {
    setSections(sections.map(section => {
      if (section.id === sectionId && fieldIndex < section.fields.length - 1) {
        const newFields = [...section.fields];
        [newFields[fieldIndex], newFields[fieldIndex + 1]] = [newFields[fieldIndex + 1], newFields[fieldIndex]];
        // Update order
        newFields.forEach((field, index) => {
          field.order = index;
        });
        return { ...section, fields: newFields };
      }
      return section;
    }));
  };

  const renderFieldControl = (field: SectionField) => {
    const { customField } = field;
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    switch (customField.field_type) {
      case 'text':
      case 'email':
        return (
          <input
            type={customField.field_type}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            disabled
          />
        );
      case 'number':
        return (
          <input
            type="number"
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            disabled
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className={baseClasses}
            disabled
          />
        );
      case 'textarea':
        return (
          <textarea
            rows={3}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={`${baseClasses} resize-vertical`}
            disabled
          />
        );
      case 'dropdown':
        return (
          <select className={baseClasses} disabled>
            <option value="">Select {customField.field_label.toLowerCase()}</option>
            {customField.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {customField.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`radio-${field.id}`}
                  value={option}
                  className="text-blue-600 focus:ring-blue-500"
                  disabled
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled
            />
            <span className="text-sm text-gray-700">{customField.field_label}</span>
          </label>
        );
      default:
        return (
          <input
            type="text"
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            disabled
          />
        );
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Overview Page Designer</h2>
      <p className="text-gray-600 mb-6">Design your overview page by adding and organizing dynamic sections.</p>
      
      {/* Project Template Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Template</h3>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Project Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a template...</option>
            {projectTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.template_name}
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              {(() => {
                const template = projectTemplates.find(t => t.id === selectedTemplate);
                return template ? (
                  <div>
                    <p className="text-sm font-medium text-blue-900">{template.template_name}</p>
                    {template.template_description && (
                      <p className="text-sm text-blue-700 mt-1">{template.template_description}</p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Add Section Button */}
      <div className="mb-8">
        <button
          onClick={addSection}
          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sections added yet</h3>
            <p className="text-gray-600 mb-4">Click "Add Section" to start designing your overview page.</p>
          </div>
        ) : (
          sections.map((section, index) => (
            <div
              key={section.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => moveSectionUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <GripVertical className="w-4 h-4 rotate-180" />
                    </button>
                    <button
                      onClick={() => moveSectionDown(index)}
                      disabled={index === sections.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {editingSection === section.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter section name"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveEdit(section.id);
                          } else if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                      />
                      <button
                        onClick={() => saveEdit(section.id)}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{section.name}</h3>
                      <span className="text-sm text-gray-500">Section {index + 1}</span>
                      <span className="text-xs text-gray-400">({section.fields.length} fields)</span>
                    </div>
                  )}
                </div>

                {editingSection !== section.id && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleSectionExpansion(section.id)}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
                      title={section.isExpanded ? "Collapse section" : "Expand section"}
                    >
                      {section.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEditing(section)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                      title="Edit section name"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
                      title="Delete section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {editingSection !== section.id && section.isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {/* Add Field Dropdown */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addFieldToSection(section.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading || customFields.length === 0}
                      >
                        <option value="">Add field to section...</option>
                        {customFields
                          .filter(field => !section.fields.some(sectionField => sectionField.customFieldId === field.id))
                          .map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.field_name} ({field.field_type})
                            </option>
                          ))}
                      </select>
                      {customFields.length === 0 && (
                        <span className="text-sm text-gray-500">No custom fields available</span>
                      )}
                    </div>
                  </div>

                  {/* Fields List */}
                  {section.fields.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                      <p className="text-sm text-gray-500 text-center">
                        No fields added yet. Select a field from the dropdown above to add it to this section.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {section.fields.map((field, fieldIndex) => (
                        <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => moveFieldUp(section.id, fieldIndex)}
                                  disabled={fieldIndex === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move field up"
                                >
                                  <GripVertical className="w-3 h-3 rotate-180" />
                                </button>
                                <button
                                  onClick={() => moveFieldDown(section.id, fieldIndex)}
                                  disabled={fieldIndex === section.fields.length - 1}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Move field down"
                                >
                                  <GripVertical className="w-3 h-3" />
                                </button>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{field.customField.field_label}</h4>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {field.customField.field_type}
                                  </span>
                                  {field.customField.is_required && (
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFieldFromSection(section.id, field.id)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Remove field"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Field Preview */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {field.customField.field_label}
                              {field.customField.is_required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {renderFieldControl(field)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Save Configuration */}
      {sections.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">Save Configuration</h4>
            <p className="text-sm text-blue-700">
              Save this overview page design for the selected project template. 
              This configuration will be used when creating projects with this template.
            </p>
          </div>
          <div className="flex justify-end space-x-4">
            <button 
              onClick={resetConfiguration}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button 
              onClick={saveConfiguration}
              disabled={saving || !selectedTemplate}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewPageDesigner;