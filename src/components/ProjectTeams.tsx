import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Users, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEMO_TENANT_NAME } from '../lib/useCurrentUser';
import ResourceAllocationHeatMap from './ResourceAllocationHeatMap';

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
  additionalRoles?: string[];
}

interface ProjectRole {
  role_name: string;
  display_name: string;
}

interface ProjectTeamsProps {
  projectId: string;
  onTeamMembersChange?: () => void;
}

export default function ProjectTeams({ projectId, onTeamMembersChange }: ProjectTeamsProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchProjectRoles();
  }, [projectId]);

  const fetchProjectRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('project_roles')
        .select('role_name, display_name')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setProjectRoles(data || []);
    } catch (error) {
      console.error('Error fetching project roles:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data: memberData, error } = await supabase
        .from('project_team_members')
        .select('id, project_id, resource_id, role, allocation_percentage, start_date, end_date')
        .eq('project_id', projectId)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const resourceIds = (memberData || []).map((m: any) => m.resource_id).filter(Boolean);
      let resourceMap = new Map<string, any>();
      if (resourceIds.length > 0) {
        const { data: resData } = await supabase
          .from('resources')
          .select('id, display_name, email, department, roles, status')
          .in('id', resourceIds);
        (resData || []).forEach((r: any) => resourceMap.set(r.id, r));
      }

      const memberIds = (memberData || []).map((m: any) => m.id).filter(Boolean);
      let rolesByMember = new Map<string, string[]>();
      if (memberIds.length > 0) {
        const { data: roleData } = await supabase
          .from('project_team_member_roles')
          .select('team_member_id, role_name')
          .in('team_member_id', memberIds);
        (roleData || []).forEach((r: any) => {
          const arr = rolesByMember.get(r.team_member_id) || [];
          if (!arr.includes(r.role_name)) arr.push(r.role_name);
          rolesByMember.set(r.team_member_id, arr);
        });
      }

      const formattedData = (memberData || []).map((item: any) => ({
        ...item,
        resources: resourceMap.get(item.resource_id) || null,
        resource: resourceMap.get(item.resource_id) || null,
        additionalRoles: rolesByMember.get(item.id) || [],
      }));

      setTeamMembers(formattedData);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const allRolesFor = (member: TeamMember): string[] => {
    const set = new Set<string>();
    if (member.role) set.add(member.role);
    (member.additionalRoles || []).forEach(r => set.add(r));
    return Array.from(set);
  };

  const handleRemoveRole = async (member: TeamMember, roleName: string) => {
    const primaryRoleCount = member.role === roleName ? 1 : 0;
    const fromAdditional = (member.additionalRoles || []).includes(roleName);

    try {
      if (fromAdditional) {
        const { error } = await supabase
          .from('project_team_member_roles')
          .delete()
          .eq('team_member_id', member.id)
          .eq('role_name', roleName);
        if (error) throw error;
      }

      if (primaryRoleCount > 0) {
        const remaining = allRolesFor(member).filter(r => r !== roleName);
        const newPrimary = remaining[0] || 'Team Members';
        const { error } = await supabase
          .from('project_team_members')
          .update({ role: newPrimary })
          .eq('id', member.id);
        if (error) throw error;

        if (remaining.length > 0) {
          for (const r of remaining) {
            await supabase
              .from('project_team_member_roles')
              .upsert(
                { team_member_id: member.id, role_name: r },
                { onConflict: 'team_member_id,role_name' }
              );
          }
        }
      }

      fetchTeamMembers();
      onTeamMembersChange?.();
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Failed to remove role');
    }
  };

  const handleAddRole = async (member: TeamMember, roleName: string) => {
    try {
      const { error } = await supabase
        .from('project_team_member_roles')
        .upsert(
          { team_member_id: member.id, role_name: roleName },
          { onConflict: 'team_member_id,role_name' }
        );
      if (error) throw error;

      if (!member.role || member.role === 'Team Member' || member.role === 'Team Members') {
        await supabase
          .from('project_team_members')
          .update({ role: roleName })
          .eq('id', member.id);
      }

      fetchTeamMembers();
      onTeamMembersChange?.();
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Failed to add role');
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
          <p className="text-sm text-gray-500 mt-1">Manage team members and their project roles. A member can hold more than one role; their permissions are combined.</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:opacity-90 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Add Team Members
        </button>
      </div>

      <ResourceAllocationHeatMap projectId={projectId} />

      {teamMembers.length > 0 && (
        <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {teamMembers.map((member) => {
                  const roles = allRolesFor(member);
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {member.resource?.display_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">{member.resource?.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {roles.length === 0 && (
                            <span className="text-sm text-gray-400">No roles</span>
                          )}
                          {roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {role}
                              <button
                                onClick={() => handleRemoveRole(member, role)}
                                className="ml-0.5 hover:text-blue-900"
                                title={`Remove ${role} role`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {member.allocation_percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {member.start_date || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <AddRoleButton
                          member={member}
                          projectRoles={projectRoles}
                          existingRoles={roles}
                          onAddRole={(roleName) => handleAddRole(member, roleName)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddMember && (
        <AddTeamMemberModal
          projectId={projectId}
          projectRoles={projectRoles}
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

interface AddRoleButtonProps {
  member: TeamMember;
  projectRoles: ProjectRole[];
  existingRoles: string[];
  onAddRole: (roleName: string) => void;
}

function AddRoleButton({ projectRoles, existingRoles, onAddRole }: AddRoleButtonProps) {
  const [open, setOpen] = useState(false);
  const available = projectRoles.filter(r => !existingRoles.includes(r.role_name));

  if (available.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add Role
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
            {available.map((role) => (
              <button
                key={role.role_name}
                onClick={() => {
                  onAddRole(role.role_name);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {role.display_name || role.role_name}
              </button>
            ))}
          </div>
        </>
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
        const memberTasks = allTasks.filter(task => task.owner_id === member.resource_id);

        for (let i = 0; i < weeks; i++) {
          const weekStart = weekStarts[i]; // Monday
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 5); // Friday (5 days from Monday)

          let totalHours = 0;

          for (const task of memberTasks) {
            const taskStart = new Date(task.start_date);
            const taskEnd = new Date(taskStart);
            taskEnd.setDate(taskEnd.getDate() + task.duration);

            const overlapStart = taskStart > weekStart ? taskStart : weekStart;
            const overlapEnd = taskEnd < weekEnd ? taskEnd : weekEnd;

            if (overlapStart < overlapEnd) {
              const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
              const hoursPerDay = 8; // 8 hours per work day
              const taskHours = overlapDays * hoursPerDay;
              totalHours += taskHours;
            }
          }

          weekMap.set(`week-${i}`, Math.min(Math.round(totalHours), 40));
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
    if (hours <= 10) return 'bg-gradient-to-br from-teal-100 to-teal-200';
    if (hours <= 30) return 'bg-gradient-to-br from-teal-300 to-teal-400';
    if (hours <= 39) return 'bg-gradient-to-br from-orange-300 to-orange-400';
    return 'bg-gradient-to-br from-red-400 to-red-500';
  };

  if (teamMembers.length === 0) {
    return null;
  }

  return (
    <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Resource Allocation Heatmap
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-br from-teal-100 to-teal-200"></div>
            <span className="text-gray-600">0-10h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-br from-teal-300 to-teal-400"></div>
            <span className="text-gray-600">11-30h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-br from-orange-300 to-orange-400"></div>
            <span className="text-gray-600">31-39h</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-br from-red-400 to-red-500"></div>
            <span className="text-gray-600">40+h</span>
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
                  className="h-12 border-b border-gray-200 flex items-center px-4 text-sm text-gray-700 font-bold"
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
                            {`${hours}h`}
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
  projectRoles: ProjectRole[];
  onClose: () => void;
  onSave: () => void;
  existingMemberResourceIds: string[];
}

function AddTeamMemberModal({ projectId, projectRoles, onClose, onSave, existingMemberResourceIds }: AddTeamMemberModalProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Team Members']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const defaultAllocation = 50;
  const defaultStartDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('id, display_name, email, department, roles, status')
        .eq('status', 'active')
        .eq('tenant_name', DEMO_TENANT_NAME)
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

  const handleToggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSave = async () => {
    if (selectedResources.length === 0) {
      alert('Please select at least one resource');
      return;
    }

    if (selectedRoles.length === 0) {
      alert('Please select at least one role');
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
        role: selectedRoles[0],
        allocation_percentage: defaultAllocation,
        start_date: defaultStartDate,
        end_date: null
      }));

      const { data: inserted, error } = await supabase
        .from('project_team_members')
        .insert(teamMemberRecords)
        .select('id');

      if (error) throw error;

      if (selectedRoles.length > 1 && inserted && inserted.length > 0) {
        const roleRecords = inserted.flatMap((member: any) =>
          selectedRoles.map((roleName) => ({
            team_member_id: member.id,
            role_name: roleName,
          }))
        );
        const { error: roleError } = await supabase
          .from('project_team_member_roles')
          .insert(roleRecords);
        if (roleError) {
          console.error('Error assigning additional roles:', roleError);
        }
      }

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
      <div className="bg-widget-bg rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Team Members</h2>
          <p className="text-sm text-gray-500 mt-1">Select resources and one or more roles for this project</p>
        </div>

        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
          <div className="flex flex-wrap gap-2">
            {projectRoles.map((role) => (
              <button
                key={role.role_name}
                type="button"
                onClick={() => handleToggleRole(role.role_name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedRoles.includes(role.role_name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role.display_name || role.role_name}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {selectedRoles.length} role{selectedRoles.length !== 1 ? 's' : ''} selected — permissions will be combined.
          </p>
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
                disabled={saving || selectedResources.length === 0 || selectedRoles.length === 0}
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
