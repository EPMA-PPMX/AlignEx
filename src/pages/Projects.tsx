import React, { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Grid3x3 as Grid3X3, List, Calendar, User, Settings2, X, Check, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { supabase } from '../lib/supabase';
import { DEMO_USER_ID } from '../lib/useCurrentUser';
import { formatDate, formatCurrencyWithK } from '../lib/utils';
import { useNotification } from '../lib/useNotification';

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
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'tile' | 'list'>('tile');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [projectFieldValues, setProjectFieldValues] = useState<Record<string, any>>({});
  const [resources, setResources] = useState<Record<string, string>>({});
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchResources();
    fetchCustomFields();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (columns.length > 0 && !preferencesLoaded) {
      loadUserPreferences();
    }
  }, [columns, preferencesLoaded]);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, display_name');

      if (error) {
        console.error('Error fetching resources:', error);
      } else {
        // Create a lookup map of resource ID to display name
        const resourceMap: Record<string, string> = {};
        (data || []).forEach(resource => {
          resourceMap[resource.id] = resource.display_name;
        });
        setResources(resourceMap);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

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
          key: field.id,
          label: field.field_name,
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

  const loadUserPreferences = async () => {
    try {
      // Load view mode preference
      const { data: viewModeData } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', DEMO_USER_ID)
        .eq('preference_key', 'project_center_view_mode')
        .maybeSingle();

      if (viewModeData?.preference_value?.viewMode) {
        setViewMode(viewModeData.preference_value.viewMode);
      }

      // Load column preferences
      const { data: columnsData } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', DEMO_USER_ID)
        .eq('preference_key', 'project_center_columns')
        .maybeSingle();

      if (columnsData?.preference_value?.enabledColumns) {
        const enabledKeys = columnsData.preference_value.enabledColumns;
        setColumns(prev => prev.map(col => ({
          ...col,
          enabled: enabledKeys.includes(col.key)
        })));
      }

      // Load groupBy preference
      const { data: groupByData } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', DEMO_USER_ID)
        .eq('preference_key', 'project_center_group_by')
        .maybeSingle();

      if (groupByData?.preference_value?.groupBy) {
        setGroupBy(groupByData.preference_value.groupBy);
      }

      setPreferencesLoaded(true);
    } catch (error) {
      console.error('Error loading user preferences:', error);
      setPreferencesLoaded(true);
    }
  };

  const saveViewModePreference = async (mode: 'tile' | 'list') => {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: DEMO_USER_ID,
          preference_key: 'project_center_view_mode',
          preference_value: { viewMode: mode },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        });
    } catch (error) {
      console.error('Error saving view mode preference:', error);
    }
  };

  const saveColumnsPreference = async (cols: ColumnConfig[]) => {
    try {
      const enabledColumns = cols.filter(c => c.enabled).map(c => c.key);
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: DEMO_USER_ID,
          preference_key: 'project_center_columns',
          preference_value: { enabledColumns },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        });
    } catch (error) {
      console.error('Error saving columns preference:', error);
    }
  };

  const saveGroupByPreference = async (groupByValue: string) => {
    try {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: DEMO_USER_ID,
          preference_key: 'project_center_group_by',
          preference_value: { groupBy: groupByValue },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        });
    } catch (error) {
      console.error('Error saving groupBy preference:', error);
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
        showNotification('Error fetching projects: ' + error.message, 'error');
      } else {
        setProjects(data || []);
        // Fetch custom field values for all projects
        if (data && data.length > 0) {
          fetchProjectFieldValues(data.map(p => p.id));
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      showNotification('Error fetching projects. Please try again.', 'error');
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
        // Organize field values by project_id and field_id
        const valuesByProject: Record<string, any> = {};
        (data || []).forEach(item => {
          if (!valuesByProject[item.project_id]) {
            valuesByProject[item.project_id] = {};
          }
          valuesByProject[item.project_id][item.field_id] = item.value;
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

  const getGroupValue = (project: Project, groupByField: string): string => {
    if (groupByField === 'none') return 'all';

    // Handle built-in fields
    if (groupByField === 'status') return project.status || 'No Status';
    if (groupByField === 'state') return project.state || 'No State';

    // Handle custom fields
    const customFieldValue = projectFieldValues[project.id]?.[groupByField];
    if (customFieldValue === undefined || customFieldValue === null || customFieldValue === '') {
      return 'No Value';
    }

    // Check if it's a people_picker field
    const field = customFields.find(f => f.id === groupByField);
    if (field?.field_type === 'people_picker') {
      return resources[customFieldValue] || customFieldValue || 'No Value';
    }

    return String(customFieldValue);
  };

  const groupedProjects = groupBy === 'none'
    ? { 'All Projects': filteredProjects }
    : filteredProjects.reduce((groups, project) => {
        const groupValue = getGroupValue(project, groupBy);
        if (!groups[groupValue]) {
          groups[groupValue] = [];
        }
        groups[groupValue].push(project);
        return groups;
      }, {} as Record<string, Project[]>);

  const handleGroupByChange = (value: string) => {
    setGroupBy(value);
    saveGroupByPreference(value);
    setExpandedGroups({});
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const isGroupExpanded = (groupName: string) => {
    return expandedGroups[groupName] !== false;
  };

  const calculateGroupRollups = (groupProjects: Project[]) => {
    const rollups: Record<string, { label: string; value: string }> = {};

    console.log('Calculating rollups for', groupProjects.length, 'projects');
    console.log('Custom fields:', customFields);
    console.log('Project field values:', projectFieldValues);

    customFields.forEach(field => {
      if (field.field_type === 'cost' || field.field_type === 'number') {
        let sum = 0;
        let count = 0;

        groupProjects.forEach(project => {
          const value = projectFieldValues[project.id]?.[field.id];
          console.log(`Project ${project.name}, Field ${field.field_name}, Value:`, value);
          if (value !== undefined && value !== null && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
              sum += numValue;
              count++;
            }
          }
        });

        console.log(`Field ${field.field_name}: sum=${sum}, count=${count}`);
        if (count > 0) {
          rollups[field.id] = {
            label: field.field_name,
            value: field.field_type === 'cost'
              ? formatCurrencyWithK(sum)
              : sum.toLocaleString()
          };
        }
      } else if (field.field_type === 'date') {
        const dates: Date[] = [];

        groupProjects.forEach(project => {
          const value = projectFieldValues[project.id]?.[field.id];
          console.log(`Project ${project.name}, Date Field ${field.field_name}, Value:`, value);
          if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              dates.push(date);
            }
          }
        });

        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
          const latest = new Date(Math.max(...dates.map(d => d.getTime())));

          if (earliest.getTime() === latest.getTime()) {
            rollups[field.id] = {
              label: field.field_name,
              value: formatDate(earliest.toISOString())
            };
          } else {
            rollups[field.id] = {
              label: field.field_name,
              value: `${formatDate(earliest.toISOString())} - ${formatDate(latest.toISOString())}`
            };
          }
        }
      }
    });

    console.log('Calculated rollups:', rollups);
    return rollups;
  };

  const getGroupByOptions = () => {
    const options = [
      { value: 'none', label: 'No Grouping' },
      { value: 'status', label: 'Status' },
      { value: 'state', label: 'State' },
    ];

    // Add custom fields that are suitable for grouping
    customFields.forEach(field => {
      if (['select', 'text', 'people_picker'].includes(field.field_type)) {
        options.push({
          value: field.id,
          label: field.field_label
        });
      }
    });

    return options;
  };

  const toggleColumn = (key: string) => {
    const updatedColumns = columns.map(col =>
      col.key === key ? { ...col, enabled: !col.enabled } : col
    );
    setColumns(updatedColumns);
    saveColumnsPreference(updatedColumns);
  };

  const handleViewModeChange = (mode: 'tile' | 'list') => {
    setViewMode(mode);
    saveViewModePreference(mode);
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
              onClick={() => handleViewModeChange('tile')}
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
              onClick={() => handleViewModeChange('list')}
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
            value={groupBy}
            onChange={(e) => handleGroupByChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {getGroupByOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.value === 'none' ? 'Group By' : `Group: ${option.label}`}
              </option>
            ))}
          </select>

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
            <div className="space-y-8">
              {Object.entries(groupedProjects).map(([groupName, groupProjects]) => {
                const rollups = calculateGroupRollups(groupProjects);
                const isExpanded = isGroupExpanded(groupName);

                return (
                  <div key={groupName}>
                    {groupBy !== 'none' && (
                      <div className="mb-4">
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="flex items-center w-full hover:bg-gray-50 p-3 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
                          )}
                          <Layers className="w-5 h-5 text-gray-500 mr-2" />
                          <h2 className="text-xl font-semibold text-gray-900">
                            {groupName}
                          </h2>
                          <span className="ml-2 text-sm text-gray-500">
                            ({groupProjects.length})
                          </span>
                          {Object.keys(rollups).length > 0 && (
                            <div className="ml-auto flex items-center gap-4">
                              {Object.values(rollups).map((rollup, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-sm">
                                  <span className="text-gray-600 font-medium">{rollup.label}:</span>
                                  <span className="text-gray-900 font-semibold">{rollup.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupProjects.map((project) => (
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
                          <p>Created: {formatDate(project.created_at)}</p>
                          {project.updated_at !== project.created_at && (
                            <p>Updated: {formatDate(project.updated_at)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="space-y-8">
              {Object.entries(groupedProjects).map(([groupName, groupProjects]) => {
                const rollups = calculateGroupRollups(groupProjects);
                const isExpanded = isGroupExpanded(groupName);

                return (
                  <div key={groupName}>
                    {groupBy !== 'none' && (
                      <div className="mb-4">
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="flex items-center w-full hover:bg-gray-50 p-3 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500 mr-2" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500 mr-2" />
                          )}
                          <Layers className="w-5 h-5 text-gray-500 mr-2" />
                          <h2 className="text-xl font-semibold text-gray-900">
                            {groupName}
                          </h2>
                          <span className="ml-2 text-sm text-gray-500">
                            ({groupProjects.length})
                          </span>
                          {Object.keys(rollups).length > 0 && (
                            <div className="ml-auto flex items-center gap-4">
                              {Object.values(rollups).map((rollup, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-sm">
                                  <span className="text-gray-600 font-medium">{rollup.label}:</span>
                                  <span className="text-gray-900 font-semibold">{rollup.value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                    {isExpanded && (
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
                          {groupProjects.map((project) => (
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
                                        {formatDate(project.created_at)}
                                      </div>
                                    </td>
                                  );
                                } else if (col.key === 'updated') {
                                  return (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {project.updated_at !== project.created_at ? (
                                        <div className="flex items-center">
                                          <Calendar className="w-4 h-4 mr-1" />
                                          {formatDate(project.updated_at)}
                                        </div>
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                  );
                                } else if (col.isCustomField) {
                                  const fieldValue = projectFieldValues[project.id]?.[col.key];
                                  return (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {fieldValue ? (
                                        col.fieldType === 'date' ? (
                                          formatDate(fieldValue)
                                        ) : col.fieldType === 'cost' ? (
                                          formatCurrencyWithK(parseFloat(fieldValue))
                                        ) : col.fieldType === 'checkbox' ? (
                                          fieldValue === 'true' || fieldValue === true ? 'Yes' : 'No'
                                        ) : col.fieldType === 'people_picker' ? (
                                          resources[fieldValue] || fieldValue
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
                  </div>
                );
              })}
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