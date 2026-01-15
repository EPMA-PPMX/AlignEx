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
  end_date: string;
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

export default function ResourceAllocationHeatMap() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [weeksToShow, setWeeksToShow] = useState(12);

  useEffect(() => {
    fetchData();
  }, []);

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
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('status', 'In-Progress');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    console.log('=== HEAT MAP: Found In-Progress projects ===', projects?.length || 0);
    console.log('Projects:', projects);

    if (!projects || projects.length === 0) {
      console.log('No In-Progress projects found');
      setAllocations([]);
      return;
    }

    const projectIds = projects.map(p => p.id);

    const { data: projectTasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('project_id, task_data')
      .in('project_id', projectIds);

    if (tasksError) {
      console.error('Error fetching project tasks:', tasksError);
      return;
    }

    console.log('=== HEAT MAP: Project Tasks Retrieved ===', projectTasks?.length || 0);
    console.log('Project Tasks:', JSON.stringify(projectTasks, null, 2));

    const projectTasksData: ProjectTaskData[] = (projectTasks || []).map(pt => ({
      project_id: pt.project_id,
      project_name: projects.find(p => p.id === pt.project_id)?.name || 'Unknown',
      task_data: pt.task_data
    }));

    console.log('=== HEAT MAP: Starting Resource Allocation Calculation ===');
    const resourceAllocationsMap = new Map<string, ResourceAllocation>();

    projectTasksData.forEach(project => {
      if (!project.task_data?.data) return;

      project.task_data.data.forEach(task => {
        if (!task.start_date || !task.end_date || !task.resource_ids || task.resource_ids.length === 0) {
          return;
        }

        // Parse dates manually to avoid timezone issues
        const parseDate = (dateStr: string): Date => {
          // Handle both ISO format (2026-01-05T18:30:00.000Z) and space format (2026-01-08 00:00)
          const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const taskStartDate = parseDate(task.start_date);
        const taskEndDate = parseDate(task.end_date);

        console.log(`Task: ${task.text}, Start: ${taskStartDate.toDateString()}, End: ${taskEndDate.toDateString()}`);

        task.resource_ids.forEach((resourceId, index) => {
          const resourceName = task.resource_names?.[index] || 'Unknown';
          const workHours = task.resource_work_hours?.[resourceId] || 0;

          if (workHours === 0) return;

          console.log(`  Resource: ${resourceName}, Work Hours: ${workHours}`);

          if (!resourceAllocationsMap.has(resourceId)) {
            resourceAllocationsMap.set(resourceId, {
              resourceId,
              resourceName,
              weeklyAllocations: new Map<string, number>(),
              totalHours: 0
            });
          }

          const allocation = resourceAllocationsMap.get(resourceId)!;
          const weeklyHours = distributeHoursAcrossWeeks(taskStartDate, taskEndDate, workHours);

          console.log(`  Weekly distribution:`, Array.from(weeklyHours.entries()).map(([week, hours]) => `${week}: ${hours.toFixed(2)}h`).join(', '));

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

    const workingDays = calculateWorkingDays(startDate, endDate);
    if (workingDays === 0) return weeklyHours;

    const hoursPerDay = totalHours / workingDays;

    // Create a new date object to avoid mutating the original
    const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateTime = endDate.getTime();

    while (currentDate.getTime() < endDateTime) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const weekKey = getWeekKey(currentDate);
        const currentWeekHours = weeklyHours.get(weekKey) || 0;
        weeklyHours.set(weekKey, currentWeekHours + hoursPerDay);
      }

      currentDate.setDate(currentDate.getDate() + 1);
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
      const monthDay = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

      weeks.push({
        key: weekKey,
        label: monthDay,
        date: new Date(weekDate)
      });

      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }, [startDate, weeksToShow]);

  const getHeatColor = (hours: number): string => {
    if (hours === 0) return 'bg-gray-50';
    if (hours <= 10) return 'bg-gradient-to-br from-[#4DB8AA] to-[#88D4CA] text-white';
    if (hours <= 30) return 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white';
    if (hours <= 39) return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white';
    return 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white';
  };

  const getCapacityIndicator = (hours: number): string => {
    if (hours === 0) return '';
    if (hours <= 10) return '🟢';
    if (hours <= 30) return '🟡';
    if (hours <= 39) return '🟠';
    if (hours <= 60) return '🔴';
    if (hours <= 100) return '🔴🔴';
    return '⚠️';
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
            No resources are currently allocated to In-Progress projects with task assignments.
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
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]"
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px]">Week of</span>
                      <span>{week.label}</span>
                    </div>
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
                            <span className="text-xs">{indicator}</span>
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
            <div className="w-4 h-4 bg-gradient-to-br from-[#4DB8AA] to-[#88D4CA] border border-[#6BC8BD] rounded"></div>
            <span className="text-sm text-gray-600">0-10 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] border border-[#349698] rounded"></div>
            <span className="text-sm text-gray-600">11-30 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#C76F21] to-[#FAAF65] border border-[#F89D43] rounded"></div>
            <span className="text-sm text-gray-600">31-39 hrs/week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] border border-[#FD5D5D] rounded"></div>
            <span className="text-sm text-gray-600">40+ hrs/week</span>
          </div>
        </div>
        <div className="space-y-2 mt-3">
          <p className="text-xs text-gray-700 font-medium bg-blue-50 p-2 rounded border border-blue-200">
            All hours shown are actual calculated allocations from task assignments. Hours are distributed evenly across working days (Mon-Fri) within each task's date range. Standard capacity reference: 40 hrs/week.
          </p>
          <p className="text-xs text-blue-600 font-medium">
            Note: Only hours within the visible date range are displayed. Use Previous/Next buttons or adjust the weeks dropdown to view allocations in other time periods.
          </p>
        </div>
      </div>
    </div>
  );
}
