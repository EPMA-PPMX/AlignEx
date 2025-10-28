import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Calendar, User, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Resource {
  id: string;
  display_name: string;
  email?: string;
  department?: string;
  roles: string[];
  status: string;
}

interface TeamMember {
  id: string;
  project_id: string;
  resource_id: string;
  role: string;
  allocation_percentage: number;
  start_date: string;
  end_date?: string;
  resource?: Resource;
}

interface ProjectTeamsProps {
  projectId: string;
}

export default function ProjectTeams({ projectId }: ProjectTeamsProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          id,
          project_id,
          resource_id,
          role,
          allocation_percentage,
          start_date,
          end_date,
          resources (
            id,
            display_name,
            email,
            department,
            roles,
            status
          )
        `)
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        resource: item.resources as any
      })) || [];

      setTeamMembers(formattedData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member from the project?')) return;

    try {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Project Team</h3>
          <p className="text-sm text-gray-500 mt-1">Manage team members assigned to this project</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Members
        </button>
      </div>

      {teamMembers.length > 0 && <ResourceAllocationHeatmap teamMembers={teamMembers} />}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {teamMembers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p>No team members assigned yet. Click "Add Team Members" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">
                          {member.resource?.display_name || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{member.resource?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{member.allocation_percentage}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(member.start_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {member.end_date ? new Date(member.end_date).toLocaleDateString() : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddTeamMemberModal
          projectId={projectId}
          onClose={() => setShowAddMember(false)}
          onSave={() => {
            setShowAddMember(false);
            fetchTeamMembers();
          }}
          existingMemberResourceIds={teamMembers.map(m => m.resource_id)}
        />
      )}
    </div>
  );
}

function ResourceAllocationHeatmap({ teamMembers }: { teamMembers: TeamMember[] }) {
  const weeks = 12;
  const [allocations, setAllocations] = useState<Map<string, Map<string, number>>>(new Map());

  useEffect(() => {
    fetchAllocations();
  }, [teamMembers]);

  const fetchAllocations = async () => {
    const allocationMap = new Map<string, Map<string, number>>();

    for (const member of teamMembers) {
      const weekMap = new Map<string, number>();
      const hoursPerWeek = (member.allocation_percentage / 100) * 40;

      for (let i = 0; i < weeks; i++) {
        const variance = Math.random() * 10 - 5;
        const hours = Math.max(0, Math.min(40, Math.floor(hoursPerWeek + variance)));
        weekMap.set(`week-${i}`, hours);
      }
      allocationMap.set(member.id, weekMap);
    }

    setAllocations(allocationMap);
  };

  const getColorClass = (hours: number) => {
    if (hours === 0) return 'bg-gray-100';
    if (hours <= 10) return 'bg-green-200';
    if (hours <= 20) return 'bg-yellow-200';
    if (hours <= 30) return 'bg-orange-300';
    return 'bg-red-400';
  };

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Resource Allocation Heatmap
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300"></div>
            <span className="text-gray-600">0h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-200"></div>
            <span className="text-gray-600">1-10h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-200"></div>
            <span className="text-gray-600">11-20h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-300"></div>
            <span className="text-gray-600">21-30h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400"></div>
            <span className="text-gray-600">31-40h</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-48 flex-shrink-0">
              <div className="h-10 border-b border-gray-200 flex items-center px-4 font-medium text-sm text-gray-900">
                Resource
              </div>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="h-12 border-b border-gray-200 flex items-center px-4 text-sm text-gray-700"
                >
                  {member.resource?.display_name || 'Unknown'}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-x-auto">
              <div className="flex">
                {Array.from({ length: weeks }).map((_, weekIndex) => (
                  <div key={weekIndex} className="flex-1 min-w-20">
                    <div className="h-10 border-b border-l border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      Week {weekIndex + 1}
                    </div>
                    {teamMembers.map((member) => {
                      const hours = allocations.get(member.id)?.get(`week-${weekIndex}`) || 0;
                      return (
                        <div
                          key={`${member.id}-${weekIndex}`}
                          className={`h-12 border-b border-l border-gray-200 flex items-center justify-center text-sm font-medium ${getColorClass(hours)}`}
                          title={`${member.resource?.display_name} - Week ${weekIndex + 1}: ${hours}h`}
                        >
                          {hours > 0 ? `${hours}h` : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddTeamMemberModalProps {
  projectId: string;
  onClose: () => void;
  onSave: () => void;
  existingMemberResourceIds: string[];
}

function AddTeamMemberModal({ projectId, onClose, onSave, existingMemberResourceIds }: AddTeamMemberModalProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [resourceDetails, setResourceDetails] = useState<{ [key: string]: { role: string; allocation: string; startDate: string; endDate: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, display_name, email, department, roles, status')
        .eq('status', 'active')
        .order('display_name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((resource) => {
    if (existingMemberResourceIds.includes(resource.id)) return false;

    const matchesSearch = resource.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.department?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleToggleResource = (resourceId: string) => {
    setSelectedResources((prev) => {
      if (prev.includes(resourceId)) {
        const newDetails = { ...resourceDetails };
        delete newDetails[resourceId];
        setResourceDetails(newDetails);
        return prev.filter((id) => id !== resourceId);
      } else {
        setResourceDetails({
          ...resourceDetails,
          [resourceId]: {
            role: '',
            allocation: '100',
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
          }
        });
        return [...prev, resourceId];
      }
    });
  };

  const updateResourceDetail = (resourceId: string, field: string, value: string) => {
    setResourceDetails({
      ...resourceDetails,
      [resourceId]: {
        ...resourceDetails[resourceId],
        [field]: value
      }
    });
  };

  const handleSave = async () => {
    if (selectedResources.length === 0) {
      alert('Please select at least one resource');
      return;
    }

    const hasEmptyRoles = selectedResources.some(id => !resourceDetails[id]?.role?.trim());
    if (hasEmptyRoles) {
      alert('Please provide a role for all selected resources');
      return;
    }

    setSaving(true);
    try {
      const teamMemberRecords = selectedResources.map((resourceId) => ({
        project_id: projectId,
        resource_id: resourceId,
        role: resourceDetails[resourceId].role,
        allocation_percentage: parseInt(resourceDetails[resourceId].allocation) || 100,
        start_date: resourceDetails[resourceId].startDate,
        end_date: resourceDetails[resourceId].endDate || null
      }));

      const { error } = await supabase
        .from('project_team_members')
        .insert(teamMemberRecords);

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error adding team members:', error);
      alert('Failed to add team members');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Team Members</h2>
          <p className="text-sm text-gray-500 mt-1">Select resources to add to the project team</p>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search resources by name, email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading resources...</div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No resources found matching your search.' : 'No available resources to add.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResources.map((resource) => {
                const isSelected = selectedResources.includes(resource.id);
                return (
                  <div
                    key={resource.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleResource(resource.id)}
                        className="w-4 h-4 mt-1 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{resource.display_name}</div>
                        <div className="text-sm text-gray-500">
                          {resource.email && <span>{resource.email}</span>}
                          {resource.email && resource.department && <span className="mx-2">•</span>}
                          {resource.department && <span>{resource.department}</span>}
                        </div>
                        {resource.roles && resource.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {resource.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        )}

                        {isSelected && (
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project Role <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={resourceDetails[resource.id]?.role || ''}
                                onChange={(e) => updateResourceDetail(resource.id, 'role', e.target.value)}
                                placeholder="e.g., Project Manager, Developer"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Allocation %
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={resourceDetails[resource.id]?.allocation || '100'}
                                onChange={(e) => updateResourceDetail(resource.id, 'allocation', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={resourceDetails[resource.id]?.startDate || ''}
                                onChange={(e) => updateResourceDetail(resource.id, 'startDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date (Optional)
                              </label>
                              <input
                                type="date"
                                value={resourceDetails[resource.id]?.endDate || ''}
                                onChange={(e) => updateResourceDetail(resource.id, 'endDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedResources.length} resource{selectedResources.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || selectedResources.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : `Add ${selectedResources.length} Member${selectedResources.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
