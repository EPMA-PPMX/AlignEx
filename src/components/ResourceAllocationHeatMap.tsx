import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';

interface Resource {
  id: string;
  display_name: string;
  status: string;
}

interface TaskData {
  id: number;
  text: string;
  start_date: string;
  end_date?: string;
  duration?: number;
  resource_ids?: string[];
  resource_names?: string[];
  resource_work_hours?: Record<string, number>;
}

interface ProjectTaskData {
  project_id: string;
  project_name: string;
  task_data: {
    data: TaskData[];
  };
}

interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  weeklyAllocations: Map<string, number>;
  totalHours: number;
}

interface ResourceAllocationHeatMapProps {
  projectId?: string | null;
}

export default function ResourceAllocationHeatMap({ projectId }: ResourceAllocationHeatMapProps) {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [weeksToShow, setWeeksToShow] = useState(12);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchResources(),
        fetchProjectTasksAndCalculateAllocations()
      ]);
    } catch (error) {
      console.error('Error fetching heat map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select('id, display_name, status')
      .eq('status', 'active')
      .order('display_name');

    if (error) {
      console.error('Error fetching resources:', error);
      return;
    }

    setResources(data || []);
  };

  const fetchProjectTasksAndCalculateAllocations = async () => {
    console.log('🔥 HEAT MAP: fetchProjectTasksAndCalculateAllocations called');
    console.log('🔥 HEAT MAP: projectId filter =', projectId);

    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('status', 'In-Progress');

    if (projectsError) {
      console.error('❌ HEAT MAP: Error fetching projects:', projectsError);
      return;
    }

    console.log('🔥 HEAT MAP: Found In-Progress projects:', projects?.length || 0);
    if (projects && projects.length > 0) {
      console.log('🔥 HEAT MAP: Projects:', projects.map(p => `${p.name} (${p.id})`).join(', '));
    }

    if (!projects || projects.length === 0) {
      console.log('No In-Progress projects found');
      setAllocations([]);
      return;
    }

    const projectIds = projects.map(p => p.id);

    // Fetch ALL project tasks from all In-Progress projects
    const { data: projectTasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('project_id, task_data')
      .in('project_id', projectIds);

    if (tasksError) {
      console.error('Error fetching project tasks:', tasksError);
      return;
    }

    console.log('🔥 HEAT MAP: Project Tasks Retrieved:', projectTasks?.length || 0);

    const projectTasksData: ProjectTaskData[] = (projectTasks || []).map(pt => ({
      project_id: pt.project_id,
      project_name: projects.find(p => p.id === pt.project_id)?.name || 'Unknown',
      task_data: pt.task_data
    }));

    console.log('🔥 HEAT MAP: Project tasks data:', projectTasksData.map(p =>
      `${p.project_name}: ${p.task_data?.data?.length || 0} tasks`
    ).join(', '));

    // Step 1: If a specific project is selected, find which resources are allocated to it
    let resourceIdsInSelectedProject: Set<string> | null = null;

    if (projectId) {
      resourceIdsInSelectedProject = new Set<string>();
      const selectedProjectTasks = projectTasksData.find(p => p.project_id === projectId);

      if (selectedProjectTasks?.task_data?.data) {
        selectedProjectTasks.task_data.data.forEach(task => {
          if (task.resource_ids && task.resource_ids.length > 0) {
            task.resource_ids.forEach(resourceId => {
              resourceIdsInSelectedProject!.add(resourceId);
            });
          }
        });
      }

      console.log(`=== HEAT MAP: Resources in selected project ${projectId} ===`, Array.from(resourceIdsInSelectedProject));

      if (resourceIdsInSelectedProject.size === 0) {
        console.log('No resources allocated to selected project');
        setAllocations([]);
        return;
      }
    }

    // Step 2: Calculate hours for resources (filtered by project if specified)
    console.log('=== HEAT MAP: Starting Resource Allocation Calculation ===');
    const resourceAllocationsMap = new Map<string, ResourceAllocation>();

    // Parse dates manually to avoid timezone issues
    const parseDate = (dateStr: string): Date => {
      const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    // Calculate end date from start date and duration (accounting for weekends)
    // Duration represents working days (Mon-Fri only)
    // Returns the date AFTER the last working day (consistent with DHTMLX Gantt)
    const calculateEndDate = (startDate: Date, durationInWorkingDays: number): Date => {
      if (durationInWorkingDays === 0) return new Date(startDate);

      const endDate = new Date(startDate);
      let workingDaysAdded = 0;

      // If start date is a working day, count it as the first day
      const startDayOfWeek = startDate.getDay();
      if (startDayOfWeek !== 0 && startDayOfWeek !== 6) {
        workingDaysAdded = 1;
      }

      // Keep adding days until we've accounted for all working days
      while (workingDaysAdded < durationInWorkingDays) {
        endDate.setDate(endDate.getDate() + 1);
        const dayOfWeek = endDate.getDay();
        // Only count working days (Mon-Fri)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDaysAdded++;
        }
      }

      // Add one more day to get the date AFTER the last working day
      endDate.setDate(endDate.getDate() + 1);

      return endDate;
    };

    projectTasksData.forEach(project => {
      if (!project.task_data?.data) {
        console.log(`🔥 HEAT MAP: Project "${project.project_name}" has no task data`);
        return;
      }

      console.log(`🔥 HEAT MAP: Processing project "${project.project_name}" with ${project.task_data.data.length} tasks`);

      project.task_data.data.forEach(task => {
        if (!task.start_date || !task.resource_ids || task.resource_ids.length === 0) {
          console.log(`  ⚠️ Skipping task "${task.text}": start_date=${!!task.start_date}, resource_ids=${task.resource_ids?.length || 0}`);
          return;
        }

        const taskStartDate = parseDate(task.start_date);

        // Calculate end_date if not provided (typical for tasks stored with duration)
        let taskEndDate: Date;
        if (task.end_date) {
          taskEndDate = parseDate(task.end_date);
          console.log(`  📅 Task "${task.text}": Using provided end_date: ${taskEndDate.toDateString()}`);
        } else if (task.duration !== undefined && task.duration > 0) {
          taskEndDate = calculateEndDate(taskStartDate, task.duration);
          console.log(`  📅 Task "${task.text}": Calculated end date from duration ${task.duration} days: ${taskStartDate.toDateString()} -> ${taskEndDate.toDateString()}`);
        } else {
          console.warn(`  ❌ Task "${task.text}" has no end_date or duration, skipping`);
          return;
        }

        task.resource_ids.forEach((resourceId, index) => {
          // Skip this resource if we're filtering by project and it's not in the selected project
          if (resourceIdsInSelectedProject && !resourceIdsInSelectedProject.has(resourceId)) {
            return;
          }

          const resourceName = task.resource_names?.[index] || 'Unknown';
          const workHours = task.resource_work_hours?.[resourceId] || 0;

          if (workHours === 0) {
            console.log(`  ⚠️ Task "${task.text}" resource "${resourceName}": 0 work hours, skipping`);
            return;
          }

          console.log(`  ✅ Task "${task.text}", Resource: ${resourceName}, Work Hours: ${workHours}`);

          if (!resourceAllocationsMap.has(resourceId)) {
            resourceAllocationsMap.set(resourceId, {
              resourceId,
              resourceName,
              weeklyAllocations: new Map<string, number>(),
              totalHours: 0
            });
          }

          const allocation = resourceAllocationsMap.get(resourceId)!;
          console.log(`  🔄 Distributing ${workHours}h from ${taskStartDate.toDateString()} to ${taskEndDate.toDateString()}`);
          const weeklyHours = distributeHoursAcrossWeeks(taskStartDate, taskEndDate, workHours);

          console.log(`  📊 Weekly distribution result:`, Array.from(weeklyHours.entries()).map(([week, hours]) => `${week}: ${hours.toFixed(2)}h`).join(', '));

          weeklyHours.forEach((hours, weekKey) => {
            const currentHours = allocation.weeklyAllocations.get(weekKey) || 0;
            allocation.weeklyAllocations.set(weekKey, currentHours + hours);
          });

          allocation.totalHours += workHours;
        });
      });
    });

    const finalAllocations = Array.from(resourceAllocationsMap.values()).sort((a, b) =>
      a.resourceName.localeCompare(b.resourceName)
    );

    console.log('=== HEAT MAP: Final Allocations ===', finalAllocations.length);
    finalAllocations.forEach(allocation => {
      console.log(`Resource: ${allocation.resourceName}, Total Hours: ${allocation.totalHours}`);
      console.log('  Weekly breakdown:', Array.from(allocation.weeklyAllocations.entries())
        .map(([week, hours]) => `${week}: ${hours.toFixed(2)}h`)
        .join(', '));
    });

    setAllocations(finalAllocations);
  };

  const distributeHoursAcrossWeeks = (
    startDate: Date,
    endDate: Date,
    totalHours: number
  ): Map<string, number> => {
    const weeklyHours = new Map<string, number>();

    // Maximum hours per working day (standard 8-hour workday)
    const MAX_HOURS_PER_DAY = 8;

    // If no hours to allocate, return empty map
    if (totalHours === 0) return weeklyHours;

    // Calculate the allocation approach based on task duration
    const workingDays = calculateWorkingDays(startDate, endDate);

    // If task duration is specified and it's reasonable, use duration-based distribution
    // Otherwise, use capacity-based distribution
    const useCapacityBased = workingDays === 0 || (totalHours / workingDays) > MAX_HOURS_PER_DAY;

    if (useCapacityBased) {
      // Capacity-based: Distribute hours starting from start date, allocating up to 8 hours per working day
      // This ensures tasks span multiple weeks if they exceed weekly capacity
      let remainingHours = totalHours;
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      console.log(`  Using capacity-based distribution for ${totalHours} hours from ${startDate.toDateString()}`);

      // Keep allocating until all hours are distributed
      while (remainingHours > 0) {
        const dayOfWeek = currentDate.getDay();

        // Only allocate on working days (Mon-Fri)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const weekKey = getWeekKey(currentDate);
          const hoursToAllocate = Math.min(remainingHours, MAX_HOURS_PER_DAY);

          const currentWeekHours = weeklyHours.get(weekKey) || 0;
          weeklyHours.set(weekKey, currentWeekHours + hoursToAllocate);

          remainingHours -= hoursToAllocate;

          console.log(`    ${currentDate.toDateString()}: allocated ${hoursToAllocate.toFixed(2)}h to week ${weekKey}, remaining: ${remainingHours.toFixed(2)}h`);
        }

        currentDate.setDate(currentDate.getDate() + 1);

        // Safety check to prevent infinite loops (max 1 year allocation)
        if (currentDate.getTime() > startDate.getTime() + (365 * 24 * 60 * 60 * 1000)) {
          console.warn('Distribution exceeded 1 year, stopping allocation');
          break;
        }
      }
    } else {
      // Duration-based: Distribute hours evenly across the specified task duration
      const hoursPerDay = totalHours / workingDays;
      const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateTime = endDate.getTime();

      console.log(`  Using duration-based distribution: ${hoursPerDay.toFixed(2)}h per day across ${workingDays} working days`);

      while (currentDate.getTime() < endDateTime) {
        const dayOfWeek = currentDate.getDay();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const weekKey = getWeekKey(currentDate);
          const currentWeekHours = weeklyHours.get(weekKey) || 0;
          weeklyHours.set(weekKey, currentWeekHours + hoursPerDay);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return weeklyHours;
  };

  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    let days = 0;
    const workingDaysList: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateTime = endDate.getTime();

    while (current.getTime() < endDateTime) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
        workingDaysList.push(current.toDateString());
      }
      current.setDate(current.getDate() + 1);
    }

    console.log(`    Working days (${days}):`, workingDaysList.join(', '));
    return days;
  };

  const getWeekKey = (date: Date): string => {
    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(startOfWeek.getDate()).padStart(2, '0');

    return `${year}-${month}-${dayOfMonth}`;
  };

  const weekColumns = useMemo(() => {
    const weeks: { key: string; label: string; date: Date }[] = [];
    const current = new Date(startDate);

    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);
    current.setHours(0, 0, 0, 0);

    for (let i = 0; i < weeksToShow; i++) {
      const weekDate = new Date(current);
      // Use same formatting method as getWeekKey to ensure consistency
      const year = weekDate.getFullYear();
      const month = String(weekDate.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(weekDate.getDate()).padStart(2, '0');
      const weekKey = `${year}-${month}-${dayOfMonth}`;

      // Calculate end of week (Friday - 4 days later from Monday)
      const endDate = new Date(weekDate);
      endDate.setDate(endDate.getDate() + 4);

      // Format: "9 Feb - 13 Feb" (Monday - Friday)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const startDay = weekDate.getDate();
      const startMonth = monthNames[weekDate.getMonth()];
      const endDay = endDate.getDate();
      const endMonth = monthNames[endDate.getMonth()];

      const label = startMonth === endMonth
        ? `${startDay} - ${endDay} ${startMonth}`
        : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

      weeks.push({
        key: weekKey,
        label: label,
        date: new Date(weekDate)
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }, [startDate, weeksToShow]);

  const getHeatColor = (hours: number): string => {
    if (hours === 0) return 'bg-gray-300';
    if (hours <= 30) return 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white';
    if (hours <= 40) return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white';
    return 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white';
  };

  const getCapacityIndicator = (hours: number): string => {
    if (hours === 0) return '';
    if (hours <= 30) return '🟢';
    if (hours <= 40) return '🟡';
    return '🔴';
  };

  const navigateWeeks = (offset: number) => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + (offset * 7));
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading heat map...</div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Resource Allocations</h3>
          <p className="text-gray-500">
            {projectId
              ? "No resources are allocated to the selected project."
              : "No resources are currently allocated to In-Progress projects with task assignments."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateWeeks(-4)}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Previous
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Today
            </button>
            <button
              onClick={() => navigateWeeks(4)}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-sm"
            >
              Next
            </button>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={weeksToShow}
              onChange={(e) => setWeeksToShow(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value={8}>8 Weeks</option>
              <option value={12}>12 Weeks</option>
              <option value={16}>16 Weeks</option>
              <option value={24}>24 Weeks</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px]">
                  Resource
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[100px]">
                  <div className="flex flex-col">
                    <span>Total Hours</span>
                    <span className="text-[10px] normal-case">(visible weeks)</span>
                  </div>
                </th>
                {weekColumns.map((week, index) => (
                  <th
                    key={week.key}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 tracking-wider min-w-[100px]"
                  >
                    <span>{week.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr key={allocation.resourceId} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {allocation.resourceName}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900 border-r border-gray-200">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold">
                        {weekColumns.reduce((sum, week) => {
                          return sum + (allocation.weeklyAllocations.get(week.key) || 0);
                        }, 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-500">hrs</span>
                    </div>
                  </td>
                  {weekColumns.map((week) => {
                    const hours = allocation.weeklyAllocations.get(week.key) || 0;
                    const indicator = getCapacityIndicator(hours);

                    return (
                      <td
                        key={week.key}
                        className={`px-3 py-3 text-center text-sm transition-colors ${getHeatColor(hours)}`}
                        title={`${allocation.resourceName}\nWeek of ${week.label}\n${hours.toFixed(1)} hours`}
                      >
                        {hours > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{hours.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 border border-gray-400 rounded"></div>
            <span className="text-sm text-gray-600">0 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] border border-[#349698] rounded"></div>
            <span className="text-sm text-gray-600">1-30 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#C76F21] to-[#FAAF65] border border-[#F89D43] rounded"></div>
            <span className="text-sm text-gray-600">31-40 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] border border-[#FD5D5D] rounded"></div>
            <span className="text-sm text-gray-600">40+ hrs/week</span>
          </div>
        </div>
        <div className="space-y-2 mt-3">
          <p className="text-xs text-gray-700 font-medium bg-blue-50 p-2 rounded border border-blue-200">
            {projectId
              ? "Showing resources allocated to the selected project. Hours shown include work from ALL projects they're assigned to, not just the selected project. Hours are distributed based on an 8-hour workday, spanning multiple weeks if needed. Tasks exceeding 40 hours/week automatically carry over to subsequent weeks."
              : "All hours shown are actual calculated allocations from task assignments. Hours are distributed based on an 8-hour workday capacity, spanning multiple weeks as needed. Tasks are allocated across working days (Mon-Fri) with a maximum of 40 hours per week. Standard capacity reference: 40 hrs/week."}
          </p>
          <p className="text-xs text-blue-600 font-medium">
            Note: Only hours within the visible date range are displayed. Use Previous/Next buttons or adjust the weeks dropdown to view allocations in other time periods.
          </p>
        </div>
      </div>
    </div>
  );
}
