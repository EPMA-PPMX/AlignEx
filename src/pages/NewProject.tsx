import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrencyInput } from '../lib/utils';
import { useNotification } from '../lib/useNotification';

interface ProjectTemplate {
  id: string;
  template_name: string;
  template_description?: string;
}

interface OrganizationalPriority {
  id: string;
  title: string;
  target_value: string;
}

const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [priorities, setPriorities] = useState<OrganizationalPriority[]>([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [priorityImpacts, setPriorityImpacts] = useState<{ [key: string]: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_id: ''
  });

  React.useEffect(() => {
    fetchTemplates();
    fetchPriorities();
  }, []);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project types:', error);
      } else {
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error fetching project templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchPriorities = async () => {
    try {
      setPrioritiesLoading(true);
      const { data, error } = await supabase
        .from('organizational_priorities')
        .select('*')
        .eq('status', 'Active')
        .order('title');

      if (error) {
        console.error('Error fetching priorities:', error);
      } else {
        setPriorities(data || []);
      }
    } catch (error) {
      console.error('Error fetching priorities:', error);
    } finally {
      setPrioritiesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.template_id) {
      showNotification('Project name and project type are required', 'error');
      return;
    }

    for (const priorityId of selectedPriorities) {
      if (!priorityImpacts[priorityId]?.trim()) {
        showNotification('Please provide planned impact for all selected priorities', 'error');
        return;
      }
    }

    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          template_id: formData.template_id || null,
          status: 'In-Progress'
        }])
        .select();

      if (projectError) {
        showNotification(`Error: ${projectError.message}`, 'error');
        return;
      }

      if (projectData && projectData[0] && selectedPriorities.length > 0) {
        const projectId = projectData[0].id;
        const impactRecords = selectedPriorities.map(priorityId => ({
          project_id: projectId,
          priority_id: priorityId,
          planned_impact: priorityImpacts[priorityId].trim(),
          actual_impact: null,
          notes: null
        }));

        const { error: impactError } = await supabase
          .from('project_priority_impacts')
          .insert(impactRecords);

        if (impactError) {
          console.error('Error linking priorities:', impactError);
        }
      }

      showNotification('Project created successfully!', 'success');
      navigate('/projects');
    } catch (error) {
      console.error('Error creating project:', error);
      showNotification('Error creating project. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePriorityToggle = (priorityId: string) => {
    setSelectedPriorities(prev => {
      if (prev.includes(priorityId)) {
        const updated = prev.filter(id => id !== priorityId);
        const newImpacts = { ...priorityImpacts };
        delete newImpacts[priorityId];
        setPriorityImpacts(newImpacts);
        return updated;
      } else {
        return [...prev, priorityId];
      }
    });
  };

  const handleImpactChange = (priorityId: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setPriorityImpacts(prev => ({
      ...prev,
      [priorityId]: formatted
    }));
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Projects</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
          <p className="text-gray-600 mt-2">Add a new project to your workspace.</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="template_id" className="block text-sm font-medium text-gray-700 mb-2">
                Project Type <span className="text-red-500">*</span>
              </label>
              {templatesLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-gray-500">Loading project types...</span>
                </div>
              ) : (
                <select
                  id="template_id"
                  name="template_id"
                  value={formData.template_id}
                  onChange={handleSelectChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={loading}
                  required
                >
                  <option value="">Select a project type</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name}
                    </option>
                  ))}
                </select>
              )}
              {templates.length === 0 && !templatesLoading && (
                <p className="text-sm text-red-500 mt-1">
                  No project types available. Please create project types in Settings first.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter project name"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Project Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-vertical"
                placeholder="Enter project description (optional)"
                disabled={loading}
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Link to Organizational Priorities (Optional)
              </label>
              {prioritiesLoading ? (
                <div className="flex items-center text-gray-500">
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  <span>Loading priorities...</span>
                </div>
              ) : priorities.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No active priorities available. Create priorities in the Organizational Priorities section.
                </p>
              ) : (
                <div className="space-y-3">
                  {priorities.map((priority) => (
                    <div key={priority.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id={`priority-${priority.id}`}
                          checked={selectedPriorities.includes(priority.id)}
                          onChange={() => handlePriorityToggle(priority.id)}
                          disabled={loading}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`priority-${priority.id}`}
                            className="font-medium text-gray-900 cursor-pointer"
                          >
                            {priority.title}
                          </label>
                          <p className="text-sm text-gray-600 mt-1">
                            Target: {priority.target_value}
                          </p>
                          {selectedPriorities.includes(priority.id) && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Planned Impact ($) <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={priorityImpacts[priority.id] || ''}
                                onChange={(e) => handleImpactChange(priority.id, e.target.value)}
                                placeholder="e.g., $50,000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={loading}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.template_id}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create Project</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProject;