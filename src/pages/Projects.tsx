import React, { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Grid3x3 as Grid3X3, List, Calendar, User, Settings2, X, Check } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  state?: string;
  created_at: string;
  updated_at: string;
  template_id?: string;
  [key: string]: any;
}

interface CustomField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  entity_type: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  enabled: boolean;
  isCustomField?: boolean;
  fieldType?: string;
}

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [projectFieldValues, setProjectFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchCustomFields();
    fetchProjects();
  }, []);

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'project')
        .order('field_label', { ascending: true });

      if (error) {
        console.error('Error fetching custom fields:', error);
      } else {
        setCustomFields(data || []);

        // Initialize columns with base fields and custom fields
        const baseColumns: ColumnConfig[] = [
          { key: 'name', label: 'Project Name', enabled: true },
          { key: 'status', label: 'Status', enabled: true },
          { key: 'state', label: 'State', enabled: false },
          { key: 'created', label: 'Created', enabled: true },
          { key: 'updated', label: 'Last Updated', enabled: false },
        ];

        const customFieldColumns: ColumnConfig[] = (data || []).map(field => ({
          key: field.field_name,
          label: field.field_label,
          enabled: false,
          isCustomField: true,
          fieldType: field.field_type
        }));

        setColumns([...baseColumns, ...customFieldColumns]);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        alert('Error fetching projects: ' + error.message);
      } else {
        setProjects(data || []);
        // Fetch custom field values for all projects
        if (data && data.length > 0) {
          fetchProjectFieldValues(data.map(p => p.id));
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      alert('Error fetching projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectFieldValues = async (projectIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('project_field_values')
        .select('*')
        .in('project_id', projectIds);

      if (error) {
        console.error('Error fetching project field values:', error);
      } else {
        // Organize field values by project_id and field_name
        const valuesByProject: Record<string, any> = {};
        (data || []).forEach(item => {
          if (!valuesByProject[item.project_id]) {
            valuesByProject[item.project_id] = {};
          }
          valuesByProject[item.project_id][item.field_name] = item.field_value;
        });
        setProjectFieldValues(valuesByProject);
      }
    } catch (error) {
      console.error('Error fetching project field values:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === 'all' || project.status.toLowerCase().replace(/[^a-z]/g, '') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const toggleColumn = (key: string) => {
    setColumns(prev => prev.map(col =>
      col.key === key ? { ...col, enabled: !col.enabled } : col
    ));
  };

  const visibleColumns = columns.filter(col => col.enabled);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Center</h1>
          <p className="text-gray-600 mt-2">Manage and track all your projects in one place.</p>
        </div>
        <button 
          onClick={() => window.location.href = '/projects/new'}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('tile')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'tile'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-sm font-medium">Tiles</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">List</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <button
              onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="w-5 h-5" />
              <span>Columns</span>
            </button>
          )}
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="inprogress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="atrisk">At Risk</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-5 h-5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading projects...</span>
        </div>
      ) : (
        <>
          {viewMode === 'tile' ? (
            /* Tile View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {project.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'In-Progress' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'On-Hold' ? 'bg-gray-100 text-gray-800' :
                      project.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    <p>Created: {new Date(project.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}</p>
                    {project.updated_at !== project.created_at && (
                      <p>Updated: {new Date(project.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {visibleColumns.map((col) => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        {visibleColumns.map((col) => {
                          if (col.key === 'name') {
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                      <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {project.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            );
                          } else if (col.key === 'status') {
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  project.status === 'In-Progress' ? 'bg-blue-100 text-blue-800' :
                                  project.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                                  project.status === 'On-Hold' ? 'bg-gray-100 text-gray-800' :
                                  project.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {project.status}
                                </span>
                              </td>
                            );
                          } else if (col.key === 'state') {
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {project.state || '-'}
                                </span>
                              </td>
                            );
                          } else if (col.key === 'created') {
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  {new Date(project.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                              </td>
                            );
                          } else if (col.key === 'updated') {
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {project.updated_at !== project.created_at ? (
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(project.updated_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          } else if (col.isCustomField) {
                            // Render custom field value
                            const fieldValue = projectFieldValues[project.id]?.[col.key];
                            return (
                              <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {fieldValue ? (
                                  col.fieldType === 'date' ? (
                                    new Date(fieldValue).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  ) : col.fieldType === 'cost' ? (
                                    `$${parseFloat(fieldValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  ) : col.fieldType === 'checkbox' ? (
                                    fieldValue === 'true' || fieldValue === true ? 'Yes' : 'No'
                                  ) : (
                                    fieldValue
                                  )
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          }
                          return null;
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          {!loading && (
            <div className="text-center">
              <p className="text-gray-500 mb-4">
                {projects.length === 0 
                  ? 'No projects found. Create your first project to get started!' 
                  : 'No projects found matching your criteria.'
                }
              </p>
              {projects.length === 0 && (
                <button 
                  onClick={() => navigate('/projects/new')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Project
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Column Customizer Modal */}
      {showColumnCustomizer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Customize Columns</h3>
              <button
                onClick={() => setShowColumnCustomizer(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Select which columns you want to display in the table view.
            </p>

            <div className="space-y-2">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    <input
                      type="checkbox"
                      checked={col.enabled}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 flex-1">
                    {col.label}
                  </span>
                  {col.enabled && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowColumnCustomizer(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;