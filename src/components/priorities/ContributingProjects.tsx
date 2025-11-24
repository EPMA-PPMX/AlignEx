import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Priority {
  id: string;
  title: string;
  target_value: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

interface ProjectImpact {
  id: string;
  project_id: string;
  priority_id: string;
  planned_impact: string;
  actual_impact: string | null;
  notes: string | null;
  project: Project;
  source: 'project' | 'initiative';
}

interface InitiativeRequest {
  id: string;
  project_name: string;
  status: string;
  expected_contribution: string;
}

interface PriorityWithProjects extends Priority {
  impacts: ProjectImpact[];
}

export default function ContributingProjects() {
  const navigate = useNavigate();
  const [priorities, setPriorities] = useState<PriorityWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: prioritiesData, error: prioritiesError } = await supabase
        .from('organizational_priorities')
        .select('*')
        .eq('status', 'Active')
        .order('title');

      if (prioritiesError) throw prioritiesError;

      const { data: impactsData, error: impactsError } = await supabase
        .from('project_priority_impacts')
        .select(`
          *,
          project:projects(id, name, status)
        `)
        .order('created_at', { ascending: false });

      if (impactsError) throw impactsError;

      const { data: requestPrioritiesData, error: requestPrioritiesError } = await supabase
        .from('project_request_priorities')
        .select(`
          *,
          request:project_initiation_requests(id, project_name, status)
        `)
        .order('created_at', { ascending: false });

      if (requestPrioritiesError) throw requestPrioritiesError;

      const prioritiesWithProjects = (prioritiesData || []).map((priority) => {
        const projectImpacts = (impactsData || [])
          .filter((impact: any) => impact.priority_id === priority.id)
          .map((impact: any) => ({
            ...impact,
            source: 'project' as const,
          }));

        const initiativeImpacts = (requestPrioritiesData || [])
          .filter((rp: any) => rp.priority_id === priority.id && rp.request?.status === 'Approved')
          .map((rp: any) => ({
            id: rp.id,
            project_id: rp.request.id,
            priority_id: rp.priority_id,
            planned_impact: rp.expected_contribution,
            actual_impact: null,
            notes: null,
            project: {
              id: rp.request.id,
              name: rp.request.project_name,
              status: 'Approved Initiative',
            },
            source: 'initiative' as const,
          }));

        return {
          ...priority,
          impacts: [...projectImpacts, ...initiativeImpacts],
        };
      });

      setPriorities(prioritiesWithProjects);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVarianceIndicator = (planned: string, actual: string | null) => {
    if (!actual) {
      return <Minus className="w-4 h-4 text-slate-400" />;
    }

    const plannedNum = parseFloat(planned.replace(/[^0-9.-]/g, ''));
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));

    if (isNaN(plannedNum) || isNaN(actualNum)) {
      return <Minus className="w-4 h-4 text-slate-400" />;
    }

    if (actualNum > plannedNum) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (actualNum < plannedNum) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getVarianceText = (planned: string, actual: string | null) => {
    if (!actual) return 'Not yet reported';

    const plannedNum = parseFloat(planned.replace(/[^0-9.-]/g, ''));
    const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));

    if (isNaN(plannedNum) || isNaN(actualNum)) {
      return 'Invalid values';
    }

    const variance = actualNum - plannedNum;
    const percentageVariance = ((variance / plannedNum) * 100).toFixed(1);

    if (variance > 0) {
      return `+${percentageVariance}% above planned`;
    } else if (variance < 0) {
      return `${percentageVariance}% below planned`;
    }
    return 'On target';
  };

  const filteredPriorities = selectedPriority === 'all'
    ? priorities
    : priorities.filter((p) => p.id === selectedPriority);

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Loading contributing projects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-600">
          View all projects and initiatives contributing to organizational priorities
        </p>
        <div>
          <label className="text-sm font-medium text-slate-700 mr-2">Filter by Priority:</label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredPriorities.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">No active priorities found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredPriorities.map((priority) => (
            <div key={priority.id} className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{priority.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Target: <span className="font-medium text-slate-900">{priority.target_value}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Contributing Projects</p>
                    <p className="text-2xl font-bold text-primary-600">{priority.impacts.length}</p>
                  </div>
                </div>
              </div>

              {priority.impacts.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  No projects or initiatives are currently contributing to this priority.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Project / Initiative
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Expected Contribution
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Actual Impact
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                          Variance
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {priority.impacts.map((impact) => (
                        <tr
                          key={impact.id}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {impact.source === 'initiative' && (
                                <FileText className="w-4 h-4 text-blue-500" title="Approved Initiative" />
                              )}
                              <span className="font-medium text-slate-900">{impact.project.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                impact.project.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : impact.project.status === 'In-Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : impact.project.status === 'Planning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : impact.project.status === 'Approved Initiative'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {impact.project.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{impact.planned_impact}</td>
                          <td className="py-3 px-4 text-slate-700">
                            {impact.actual_impact || (
                              <span className="text-slate-400 italic">Not reported</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {getVarianceIndicator(impact.planned_impact, impact.actual_impact)}
                              <span className="text-sm text-slate-600">
                                {getVarianceText(impact.planned_impact, impact.actual_impact)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                if (impact.source === 'initiative') {
                                  navigate('/initiation');
                                } else {
                                  navigate(`/projects/${impact.project_id}`);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                              title={impact.source === 'initiative' ? 'View in Project Initiation' : 'View project details'}
                            >
                              View
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {priority.impacts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="bg-primary-50 rounded-lg p-3">
                      <p className="text-slate-600 mb-1">Total Contributing</p>
                      <p className="text-lg font-semibold text-primary-700">
                        {priority.impacts.length} {priority.impacts.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-slate-600 mb-1">Approved Initiatives</p>
                      <p className="text-lg font-semibold text-emerald-700">
                        {priority.impacts.filter((i) => i.source === 'initiative').length}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-slate-600 mb-1">Reported Actuals</p>
                      <p className="text-lg font-semibold text-green-700">
                        {priority.impacts.filter((i) => i.actual_impact).length} of {priority.impacts.length}
                      </p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-slate-600 mb-1">Pending Reports</p>
                      <p className="text-lg font-semibold text-amber-700">
                        {priority.impacts.filter((i) => !i.actual_impact).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
