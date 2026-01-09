import { useState, useEffect } from 'react';
import { Users, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface TeamMember {
  id: string;
  resource_id: string;
  display_name: string;
}

interface Task {
  id: string;
  text: string;
  start_date: string;
  duration: number;
  owner_id?: string;
}

export default function TeamCapacityWidget() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allocations, setAllocations] = useState<Map<string, Map<string, number>>>(new Map());
  const [weekStartDates, setWeekStartDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  const weeks = 4;

  useEffect(() => {
    fetchTeamCapacity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTeamCapacity = async () => {
    try {
      setLoading(true);

      // Get user's resource_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('resource_id')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (userError || !userData?.resource_id) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      // First, get the Project Manager field ID
      const { data: pmField, error: pmFieldError } = await supabase
        .from('custom_fields')
        .select('id')
        .eq('field_name', 'Project Manager')
        .eq('entity_type', 'project')
        .maybeSingle();

      if (pmFieldError) throw pmFieldError;
      if (!pmField) {
        setTeamMembers([]);
        return;
      }

      // Get all projects where the user is the Project Manager
      const { data: projectFieldValues, error: pfvError } = await supabase
        .from('project_field_values')
        .select('project_id')
        .eq('field_id', pmField.id)
        .eq('value', userData.resource_id);

      if (pfvError) throw pfvError;

      const projectIds = (projectFieldValues || []).map(pfv => pfv.project_id);

      if (projectIds.length === 0) {
        setTeamMembers([]);
        return;
      }

      // Get team members from those projects
      const { data: projectTeams, error: teamsError } = await supabase
        .from('project_team_members')
        .select(`
          id,
          resource_id,
          projects:projects!inner (
            id,
            status
          ),
          resources (
            id,
            display_name
          )
        `)
        .in('project_id', projectIds);

      if (teamsError) throw teamsError;

      const activeTeams = (projectTeams || []).filter(
        (team: any) => team.projects?.status !== 'Completed' && team.projects?.status !== 'Cancelled'
      );

      // Get unique resources
      const uniqueResources = new Map<string, TeamMember>();
      activeTeams.forEach((team: any) => {
        if (team.resource_id && team.resources && !uniqueResources.has(team.resource_id)) {
          uniqueResources.set(team.resource_id, {
            id: team.id,
            resource_id: team.resource_id,
            display_name: team.resources.display_name
          });
        }
      });

      const members = Array.from(uniqueResources.values());
      setTeamMembers(members);

      // Calculate allocations
      if (members.length > 0) {
        await calculateAllocations(members);
      }
    } catch (error) {
      console.error('Error fetching team capacity:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAllocations = async (members: TeamMember[]) => {
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
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const currentMonday = new Date(today);
      currentMonday.setDate(today.getDate() - daysFromMonday);
      currentMonday.setHours(0, 0, 0, 0);

      // Create week starts for each Monday
      const weekStarts = Array.from({ length: weeks }, (_, i) => {
        const date = new Date(currentMonday);
        date.setDate(currentMonday.getDate() + (i * 7));
        return date;
      });

      for (const member of members) {
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

        allocationMap.set(member.resource_id, weekMap);
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
    if (hours <= 10) return 'bg-green-200';
    if (hours <= 30) return 'bg-yellow-200';
    return 'bg-red-400';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            My Team Workload
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          My Team Workload
        </h3>
        <span className="text-xs text-gray-500">
          Next {weeks} weeks
        </span>
      </div>

      {teamMembers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Users className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No team allocations</p>
          <p className="text-sm text-gray-500">Assign team members to your projects</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs mb-3 pb-3 border-b border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <span className="text-gray-600">0h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-200 rounded"></div>
              <span className="text-gray-600">1-10h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-yellow-200 rounded"></div>
              <span className="text-gray-600">11-30h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-gray-600">31-40h</span>
            </div>
          </div>

          {/* Heatmap */}
          <div className="flex-1 overflow-auto">
            <div className="flex">
              {/* Resource Names */}
              <div className="w-36 flex-shrink-0 pr-2">
                <div className="h-8 flex items-center text-xs font-medium text-gray-900">
                  Resource
                </div>
                {teamMembers.map((member) => (
                  <div
                    key={member.resource_id}
                    className="h-10 flex items-center text-xs text-gray-700 border-b border-gray-100"
                  >
                    <span className="truncate">{member.display_name}</span>
                  </div>
                ))}
              </div>

              {/* Week Columns */}
              <div className="flex-1 flex">
                {Array.from({ length: weeks }).map((_, weekIndex) => {
                  const weekStart = weekStartDates[weekIndex];
                  const weekLabel = weekStart ? formatWeekRange(weekStart) : `Week ${weekIndex + 1}`;

                  return (
                    <div key={weekIndex} className="flex-1 min-w-20">
                      <div className="h-8 flex items-center justify-center text-xs font-medium text-gray-600 border-l border-gray-200">
                        <span className="text-center">{weekLabel}</span>
                      </div>
                      {teamMembers.map((member) => {
                        const hours = allocations.get(member.resource_id)?.get(`week-${weekIndex}`) || 0;
                        return (
                          <div
                            key={`${member.resource_id}-${weekIndex}`}
                            className="h-10 flex items-center justify-center border-l border-b border-gray-200"
                          >
                            <div
                              className={`w-full h-full flex items-center justify-center ${getColorClass(hours)}`}
                              title={`${hours}h workload`}
                            >
                              <span className="text-xs font-medium text-gray-700">
                                {hours}h
                              </span>
                            </div>
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
      )}
    </div>
  );
}
