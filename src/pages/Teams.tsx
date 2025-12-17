import { useState, useEffect } from 'react';
import { UsersRound, Plus, Search, Trash2, Calendar, User } from 'lucide-react';
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
  resource_id: string;
  added_at: string;
  resource: Resource;
}

interface ProjectAllocation {
  project_id: string;
  project_name: string;
  week_start: string;
  allocated_hours: number;
}

export default function Teams() {
  const { showConfirm, showNotification } = useNotification();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_team_members')
        .select(`
          id,
          resource_id,
          added_at,
          resources (
            id,
            display_name,
            email,
            department,
            roles,
            status
          )
        `)
        .order('added_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        id: item.id,
        resource_id: item.resource_id,
        added_at: item.added_at,
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
      message: 'Are you sure you want to remove this team member?',
      confirmText: 'Remove'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organization_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
      showNotification('Failed to remove team member', 'error');
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
          <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-500 mt-1">Manage team members and view resource allocation</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Members
        </button>
      </div>

      <ResourceAllocationHeatmap teamMembers={teamMembers} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </div>

        {teamMembers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No team members yet. Click "Add Team Members" to get started.
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
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                          {member.resource.display_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{member.resource.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{member.resource.department || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {member.resource.roles && member.resource.roles.length > 0 ? (
                          member.resource.roles.map((role, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.resource.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.resource.status}
                      </span>
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
          onClose={() => setShowAddMember(false)}
          onSave={() => {
            setShowAddMember(false);
            fetchTeamMembers();
          }}
          existingMemberIds={teamMembers.map(m => m.resource_id)}
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
    try {
      // Initialize allocation map for all team members
      const allocationMap = new Map<string, Map<string, number>>();
      for (const member of teamMembers) {
        allocationMap.set(member.resource_id, new Map<string, number>());
      }

      // Get today's date to calculate week offsets
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all project tasks
      const { data: projectTasksData, error } = await supabase
        .from('project_tasks')
        .select('task_data, project_id, projects(name)');

      if (error) {
        console.error('Error fetching project tasks:', error);
        setAllocations(allocationMap);
        return;
      }

      // Fetch all project team members with allocation percentages
      const { data: projectTeamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('project_id, resource_id, allocation_percentage');

      if (teamError) {
        console.error('Error fetching project team members:', teamError);
      }

      // Create a map of project_id + resource_id -> allocation_percentage
      const allocationPercentageMap = new Map<string, number>();
      if (projectTeamData) {
        for (const teamMember of projectTeamData) {
          const key = `${teamMember.project_id}_${teamMember.resource_id}`;
          allocationPercentageMap.set(key, teamMember.allocation_percentage || 100);
        }
      }

      // Process each project's tasks
      for (const projectRecord of projectTasksData || []) {
        if (!projectRecord.task_data?.data) continue;

        const tasks = projectRecord.task_data.data;
        const projectId = projectRecord.project_id;

        // Process each task
        for (const task of tasks) {
          // Skip tasks without resources or work hours
          if (!task.resource_ids || task.resource_ids.length === 0 || !task.work_hours) continue;

          // Parse task dates
          let taskStartDate: Date | null = null;
          let taskEndDate: Date | null = null;

          if (task.start_date) {
            const startStr = String(task.start_date);
            taskStartDate = new Date(startStr.split(' ')[0]);
            taskStartDate.setHours(0, 0, 0, 0);
          }

          if (task.end_date) {
            const endStr = String(task.end_date);
            taskEndDate = new Date(endStr.split(' ')[0]);
            taskEndDate.setHours(0, 0, 0, 0);
          } else if (taskStartDate && task.duration) {
            // Calculate end date if not provided
            taskEndDate = new Date(taskStartDate);
            // Simple calculation: add duration days (accounting for weekends would be more complex)
            let daysToAdd = task.duration;
            while (daysToAdd > 0) {
              taskEndDate.setDate(taskEndDate.getDate() + 1);
              const dayOfWeek = taskEndDate.getDay();
              // Skip weekends
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                daysToAdd--;
              }
            }
          }

          if (!taskStartDate || !taskEndDate) continue;

          // Calculate work days in the task duration
          let workDays = 0;
          const currentDate = new Date(taskStartDate);
          while (currentDate <= taskEndDate) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              workDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }

          if (workDays === 0) continue;

          // Use resource_work_hours if available (new format), otherwise calculate from allocation
          const resourceWorkHours = task.resource_work_hours || {};

          // Distribute work hours for each resource
          for (const resourceId of task.resource_ids) {
            const resourceWeekMap = allocationMap.get(resourceId);
            if (!resourceWeekMap) continue;

            // Get resource's total work hours for this task
            let resourceTotalHours = 0;

            if (resourceWorkHours[resourceId]) {
              // Use pre-calculated resource-specific hours from the task
              resourceTotalHours = resourceWorkHours[resourceId];
            } else {
              // Fallback: calculate from allocation percentage (for old tasks)
              const key = `${projectId}_${resourceId}`;
              const allocationPercentage = allocationPercentageMap.get(key) || 100;
              const taskDuration = task.duration || workDays;
              resourceTotalHours = taskDuration * 8 * (allocationPercentage / 100);
            }

            // Calculate hours per day for this resource
            const hoursPerDay = resourceTotalHours / workDays;

            // Iterate through each day of the task
            const iterDate = new Date(taskStartDate);
            while (iterDate <= taskEndDate) {
              const dayOfWeek = iterDate.getDay();

              // Only count weekdays
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                // Calculate which week this date falls into (relative to today)
                const daysDiff = Math.floor((iterDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const weekIndex = Math.floor(daysDiff / 7);

                // Only count if it's within our 12-week window
                if (weekIndex >= 0 && weekIndex < weeks) {
                  const weekKey = `week-${weekIndex}`;
                  const currentHours = resourceWeekMap.get(weekKey) || 0;
                  resourceWeekMap.set(weekKey, currentHours + hoursPerDay);
                }
              }

              iterDate.setDate(iterDate.getDate() + 1);
            }
          }
        }
      }

      setAllocations(allocationMap);
    } catch (error) {
      console.error('Error calculating allocations:', error);
      // Set empty allocations on error
      const allocationMap = new Map<string, Map<string, number>>();
      for (const member of teamMembers) {
        allocationMap.set(member.resource_id, new Map<string, number>());
      }
      setAllocations(allocationMap);
    }
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
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Resource Allocation Heatmap
        </h2>
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
                  {member.resource.display_name}
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
                      const hours = allocations.get(member.resource_id)?.get(`week-${weekIndex}`) || 0;
                      const roundedHours = Math.round(hours);
                      return (
                        <div
                          key={`${member.id}-${weekIndex}`}
                          className={`h-12 border-b border-l border-gray-200 flex items-center justify-center text-sm font-medium ${getColorClass(roundedHours)}`}
                          title={`${member.resource.display_name} - Week ${weekIndex + 1}: ${hours.toFixed(1)}h`}
                        >
                          {roundedHours > 0 ? `${roundedHours}h` : ''}
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
  onClose: () => void;
  onSave: () => void;
  existingMemberIds: string[];
}

function AddTeamMemberModal({ onClose, onSave, existingMemberIds }: AddTeamMemberModalProps) {
  const { showNotification } = useNotification();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
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
    if (existingMemberIds.includes(resource.id)) return false;

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
      showNotification('Please select at least one resource', 'info');
      return;
    }

    setSaving(true);
    try {
      const teamMemberRecords = selectedResources.map((resourceId) => ({
        resource_id: resourceId,
      }));

      const { error } = await supabase
        .from('organization_team_members')
        .insert(teamMemberRecords);

      if (error) throw error;
      onSave();
    } catch (error) {
      console.error('Error adding team members:', error);
      showNotification('Failed to add team members', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Team Members</h2>
          <p className="text-sm text-gray-500 mt-1">Select resources to add to the team</p>
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
