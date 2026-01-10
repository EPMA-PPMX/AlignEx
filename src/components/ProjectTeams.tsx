import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Calendar, User, Users, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';

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
  onTeamMembersChange?: () => void;
}

export default function ProjectTeams({ projectId, onTeamMembersChange }: ProjectTeamsProps) {
  const { showConfirm } = useNotification();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    role: string;
  }>({
    role: ''
  });

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
    const confirmed = await showConfirm({
      title: 'Remove Team Member',
      message: 'Are you sure you want to remove this team member from the project?',
      confirmText: 'Remove'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTeamMembers();
      onTeamMembersChange?.();
    } catch (error) {
      console.error('Error removing team member:', error);
      alert('Failed to remove team member');
    }
  };

  const handleStartEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditValues({
      role: member.role
    });
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditValues({
      role: ''
    });
  };

  const handleSaveEdit = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_team_members')
        .update({
          role: editValues.role
        })
        .eq('id', memberId);

      if (error) throw error;

      setEditingMemberId(null);
      fetchTeamMembers();
      onTeamMembersChange?.();
    } catch (error) {
      console.error('Error updating team member:', error);
      alert('Failed to update team member');
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member) => {
                  const isEditing = editingMemberId === member.id;

                  return (
                    <tr key={member.id} className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}>
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
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.role}
                            onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="text-sm text-gray-900">{member.role}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSaveEdit(member.id)}
                              className="p-1 text-green-600 hover:text-green-900 hover:bg-green-100 rounded transition-colors"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleStartEdit(member)}
                              className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-red-600 hover:text-red-900 hover:bg-red-100 rounded transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
            onTeamMembersChange?.();
          }}
          existingMemberResourceIds={teamMembers.map(m => m.resource_id)}
        />
      )}
    </div>
  );
}

interface Task {
  id: number;
  text: string;
  start_date: string;
  duration: number;
  owner_id?: string;
  owner_name?: string;
  parent?: number;
  resource_ids?: string[];
  resource_allocations?: Record<string, number>;
}

function ResourceAllocationHeatmap({ teamMembers }: { teamMembers: TeamMember[] }) {
  const weeks = 12;
  const [allocations, setAllocations] = useState<Map<string, Map<string, number>>>(new Map());
  const [weekStartDates, setWeekStartDates] = useState<Date[]>([]);
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (teamMembers.length > 0) {
      setProjectId(teamMembers[0].project_id);
    }
  }, [teamMembers]);

  useEffect(() => {
    if (projectId) {
      fetchAllocations();
    }
  }, [teamMembers, projectId]);

  // Helper function to count business days (excluding weekends) between two dates
  const countBusinessDays = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const current = new Date(startDate);

    while (current < endDate) {
      const dayOfWeek = current.getDay();
      // Count only weekdays (Monday=1 to Friday=5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  };

  // Helper function to add business days to a date (for calculating task end date)
  const addBusinessDays = (startDate: Date, businessDays: number): Date => {
    const result = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      // Only count weekdays
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return result;
  };

  const fetchAllocations = async () => {
    const allocationMap = new Map<string, Map<string, number>>();

    try {
      // Fetch ALL project tasks across all projects
      const { data: allProjectTasks, error } = await supabase
        .from('project_tasks')
        .select('task_data, project_id');

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      // Flatten all tasks from all projects into a single array
      const allTasks: Task[] = [];
      if (allProjectTasks) {
        for (const projectTask of allProjectTasks) {
          const tasks = projectTask.task_data?.data || [];
          allTasks.push(...tasks);
        }
      }

      // Get the current Monday (start of work week)
      const today = new Date();
      const currentDay = today.getDay();
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days, else go back to Monday
      const currentMonday = new Date(today);
      currentMonday.setDate(today.getDate() - daysFromMonday);
      currentMonday.setHours(0, 0, 0, 0);

      // Create week starts for each Monday
      const weekStarts = Array.from({ length: weeks }, (_, i) => {
        const date = new Date(currentMonday);
        date.setDate(currentMonday.getDate() + (i * 7));
        return date;
      });

      for (const member of teamMembers) {
        const weekMap = new Map<string, number>();
        // Filter tasks across ALL projects for this resource
        // Include tasks where the member is in resource_ids array OR is the owner_id
        const memberTasks = allTasks.filter(task =>
          task.resource_ids?.includes(member.resource_id) ||
          task.owner_id === member.resource_id
        );

        for (let i = 0; i < weeks; i++) {
          const weekStart = weekStarts[i]; // Monday
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 5); // Friday (5 days from Monday)

          let totalHours = 0;

          for (const task of memberTasks) {
            const taskStart = new Date(task.start_date);
            // Task duration in Gantt represents working days, not calendar days
            const taskEnd = addBusinessDays(taskStart, task.duration);

            const overlapStart = taskStart > weekStart ? taskStart : weekStart;
            const overlapEnd = taskEnd < weekEnd ? taskEnd : weekEnd;

            if (overlapStart < overlapEnd) {
              // Count only business days (weekdays) in the overlap period
              const overlapBusinessDays = countBusinessDays(overlapStart, overlapEnd);
              const hoursPerDay = 8; // 8 hours per work day

              // Get allocation percentage from task's resource_allocations attribute
              const allocationPercentage = task.resource_allocations?.[member.resource_id] || 100;
              const allocationMultiplier = allocationPercentage / 100;
              const taskHours = overlapBusinessDays * hoursPerDay * allocationMultiplier;
              totalHours += taskHours;
            }
          }

          weekMap.set(`week-${i}`, Math.round(totalHours));
        }

        allocationMap.set(member.id, weekMap);
      }

      setAllocations(allocationMap);
      setWeekStartDates(weekStarts);
    } catch (error) {
      console.error('Error calculating allocations:', error);
    }
  };

  const formatWeekRange = (startDate: Date) => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4); // Friday (4 days from Monday)

    const formatDate = (date: Date) => {
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      return `${month} ${day}`;
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getColorClass = (hours: number) => {
    if (hours === 0) return 'bg-gray-100';
    if (hours < 30) return 'bg-green-200';
    if (hours <= 40) return 'bg-yellow-200';
    return 'bg-red-500';
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
            <span className="text-gray-600">1-30h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-200"></div>
            <span className="text-gray-600">30-40h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500"></div>
            <span className="text-gray-600">40h+</span>
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
                {Array.from({ length: weeks }).map((_, weekIndex) => {
                  const weekStart = weekStartDates[weekIndex];
                  const weekLabel = weekStart ? formatWeekRange(weekStart) : `Week ${weekIndex + 1}`;

                  return (
                    <div key={weekIndex} className="flex-1 min-w-32">
                      <div className="h-10 border-b border-l border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 px-2">
                        {weekLabel}
                      </div>
                      {teamMembers.map((member) => {
                        const hours = allocations.get(member.id)?.get(`week-${weekIndex}`) || 0;
                        return (
                          <div
                            key={`${member.id}-${weekIndex}`}
                            className={`h-12 border-b border-l border-gray-200 flex items-center justify-center text-sm font-medium ${getColorClass(hours)}`}
                            title={`${member.resource?.display_name} - ${weekLabel}: ${hours}h`}
                          >
                            {hours > 0 ? `${hours}h` : ''}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultStartDate, setDefaultStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultRole, setDefaultRole] = useState('Team Member');

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
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleSave = async () => {
    if (selectedResources.length === 0) {
      alert('Please select at least one resource');
      return;
    }

    if (!defaultStartDate) {
      alert('Please select a start date');
      return;
    }

    setSaving(true);
    try {
      const teamMemberRecords = selectedResources.map((resourceId) => ({
        project_id: projectId,
        resource_id: resourceId,
        role: defaultRole,
        allocation_percentage: 100,
        start_date: defaultStartDate,
        end_date: null
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="space-y-2">
              {filteredResources.map((resource) => (
                <label
                  key={resource.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(resource.id)}
                    onChange={() => handleToggleResource(resource.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
                  </div>
                </label>
              ))}
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
