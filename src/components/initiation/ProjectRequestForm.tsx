import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Send, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrencyInput } from '../../lib/utils';

interface ProjectRequest {
  id: string;
  project_name: string;
  description: string;
  project_type: string;
  problem_statement: string;
  estimated_start_date: string | null;
  estimated_duration: string | null;
  initial_estimated_cost: string | null;
  expected_benefits: string;
  consequences_of_inaction: string;
  comments: string | null;
  status: string;
}

interface OrganizationalPriority {
  id: string;
  title: string;
  target_value: string;
}

interface ProjectTemplate {
  id: string;
  template_name: string;
  template_description?: string;
}

interface Props {
  request: ProjectRequest | null;
  onClose: () => void;
}

export default function ProjectRequestForm({ request, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [priorities, setPriorities] = useState<OrganizationalPriority[]>([]);
  const [prioritiesLoading, setPrioritiesLoading] = useState(true);
  const [projectTypes, setProjectTypes] = useState<ProjectTemplate[]>([]);
  const [projectTypesLoading, setProjectTypesLoading] = useState(true);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [priorityContributions, setPriorityContributions] = useState<{ [key: string]: string }>({});

  const [formData, setFormData] = useState({
    project_name: request?.project_name || '',
    description: request?.description || '',
    project_type: request?.project_type || '',
    problem_statement: request?.problem_statement || '',
    estimated_start_date: request?.estimated_start_date || '',
    estimated_duration: request?.estimated_duration || '',
    initial_estimated_cost: request?.initial_estimated_cost || '',
    expected_benefits: request?.expected_benefits || '',
    consequences_of_inaction: request?.consequences_of_inaction || '',
    comments: request?.comments || '',
  });

  useEffect(() => {
    fetchPriorities();
    fetchProjectTypes();
    if (request) {
      fetchRequestPriorities(request.id);
    }
  }, [request]);

  const fetchPriorities = async () => {
    try {
      setPrioritiesLoading(true);
      const { data, error } = await supabase
        .from('organizational_priorities')
        .select('*')
        .eq('status', 'Active')
        .order('title');

      if (error) throw error;
      setPriorities(data || []);
    } catch (error) {
      console.error('Error fetching priorities:', error);
    } finally {
      setPrioritiesLoading(false);
    }
  };

  const fetchProjectTypes = async () => {
    try {
      setProjectTypesLoading(true);
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('template_name');

      if (error) throw error;
      setProjectTypes(data || []);
    } catch (error) {
      console.error('Error fetching project types:', error);
    } finally {
      setProjectTypesLoading(false);
    }
  };

  const fetchRequestPriorities = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_request_priorities')
        .select('*')
        .eq('request_id', requestId);

      if (error) throw error;

      if (data) {
        const priorityIds = data.map((p: any) => p.priority_id);
        const contributions = data.reduce((acc: any, p: any) => {
          acc[p.priority_id] = p.expected_contribution;
          return acc;
        }, {});

        setSelectedPriorities(priorityIds);
        setPriorityContributions(contributions);
      }
    } catch (error) {
      console.error('Error fetching request priorities:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'initial_estimated_cost') {
      const formatted = formatCurrencyInput(value);
      setFormData((prev) => ({ ...prev, [name]: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePriorityToggle = (priorityId: string) => {
    setSelectedPriorities((prev) => {
      if (prev.includes(priorityId)) {
        const updated = prev.filter((id) => id !== priorityId);
        const newContributions = { ...priorityContributions };
        delete newContributions[priorityId];
        setPriorityContributions(newContributions);
        return updated;
      } else {
        return [...prev, priorityId];
      }
    });
  };

  const handleContributionChange = (priorityId: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setPriorityContributions((prev) => ({
      ...prev,
      [priorityId]: formatted,
    }));
  };

  const validateForm = () => {
    if (!formData.project_name.trim()) {
      alert('Project name is required');
      return false;
    }
    if (!formData.project_type.trim()) {
      alert('Project type is required');
      return false;
    }
    if (!formData.problem_statement.trim()) {
      alert('Problem statement is required');
      return false;
    }
    if (!formData.expected_benefits.trim()) {
      alert('Expected benefits is required');
      return false;
    }
    if (!formData.consequences_of_inaction.trim()) {
      alert('Consequences of inaction is required');
      return false;
    }

    for (const priorityId of selectedPriorities) {
      if (!priorityContributions[priorityId]?.trim()) {
        alert('Please provide expected contribution for all selected priorities');
        return false;
      }
    }

    return true;
  };

  const handleSave = async (isDraft: boolean) => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const requestData = {
        ...formData,
        status: isDraft ? 'Draft' : 'Pending Approval',
        submitted_at: isDraft ? null : new Date().toISOString(),
      };

      let requestId = request?.id;

      if (request) {
        const { error } = await supabase
          .from('project_initiation_requests')
          .update(requestData)
          .eq('id', request.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('project_initiation_requests')
          .insert([requestData])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          requestId = data[0].id;
        }
      }

      if (requestId && selectedPriorities.length > 0) {
        await supabase
          .from('project_request_priorities')
          .delete()
          .eq('request_id', requestId);

        const priorityRecords = selectedPriorities.map((priorityId) => ({
          request_id: requestId,
          priority_id: priorityId,
          expected_contribution: priorityContributions[priorityId].trim(),
        }));

        const { error: priorityError } = await supabase
          .from('project_request_priorities')
          .insert(priorityRecords);

        if (priorityError) throw priorityError;
      }

      alert(
        isDraft
          ? 'Request saved as draft successfully!'
          : 'Request submitted for approval successfully!'
      );
      onClose();
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Error saving request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Requests</span>
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {request ? 'Edit Project Request' : 'New Project Initiation Request'}
          </h1>
          <p className="text-slate-600 mt-2">
            Fill in the details below to submit a project request
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Project Type <span className="text-red-500">*</span>
              </label>
              {projectTypesLoading ? (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 flex items-center">
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-slate-500">Loading project types...</span>
                </div>
              ) : (
                <select
                  name="project_type"
                  value={formData.project_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select project type</option>
                  {projectTypes.map((type) => (
                    <option key={type.id} value={type.template_name}>
                      {type.template_name}
                    </option>
                  ))}
                </select>
              )}
              {projectTypes.length === 0 && !projectTypesLoading && (
                <p className="text-sm text-red-500 mt-1">
                  No project types available. Please create project types in Settings first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Start Date
              </label>
              <input
                type="date"
                name="estimated_start_date"
                value={formData.estimated_start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimated Duration
              </label>
              <input
                type="text"
                name="estimated_duration"
                value={formData.estimated_duration}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 3 months, 6 weeks"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Initial Estimated Cost ($)
              </label>
              <input
                type="text"
                name="initial_estimated_cost"
                value={formData.initial_estimated_cost}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., $50,000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Problem Statement <span className="text-red-500">*</span>
            </label>
            <textarea
              name="problem_statement"
              value={formData.problem_statement}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the problem this project will address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expected Benefits <span className="text-red-500">*</span>
            </label>
            <textarea
              name="expected_benefits"
              value={formData.expected_benefits}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What benefits will this project bring to the organization?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Consequences of Inaction <span className="text-red-500">*</span>
            </label>
            <textarea
              name="consequences_of_inaction"
              value={formData.consequences_of_inaction}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What will happen if this project is not undertaken?"
              required
            />
          </div>

          <div className="border-t border-slate-200 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Link to Organizational Priorities
            </label>
            {prioritiesLoading ? (
              <div className="flex items-center text-slate-500">
                <Loader className="w-4 h-4 animate-spin mr-2" />
                <span>Loading priorities...</span>
              </div>
            ) : priorities.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active priorities available.
              </p>
            ) : (
              <div className="space-y-3">
                {priorities.map((priority) => (
                  <div key={priority.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={`priority-${priority.id}`}
                        checked={selectedPriorities.includes(priority.id)}
                        onChange={() => handlePriorityToggle(priority.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`priority-${priority.id}`}
                          className="font-medium text-slate-900 cursor-pointer"
                        >
                          {priority.title}
                        </label>
                        <p className="text-sm text-slate-600 mt-1">
                          Target: {priority.target_value}
                        </p>
                        {selectedPriorities.includes(priority.id) && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Expected Contribution ($) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={priorityContributions[priority.id] || ''}
                              onChange={(e) => handleContributionChange(priority.id, e.target.value)}
                              placeholder="e.g., $100,000"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional Comments / Notes
            </label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional information or context..."
            />
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save as Draft</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit for Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
