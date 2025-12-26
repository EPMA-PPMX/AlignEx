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
      .eq('status', 'In Progress');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    if (!projects || projects.length === 0) {
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

    const projectTasksData: ProjectTaskData[] = (projectTasks || []).map(pt => ({
      project_id: pt.project_id,
      project_name: projects.find(p => p.id === pt.project_id)?.name || 'Unknown',
      task_data: pt.task_data
    }));

    const resourceAllocationsMap = new Map<string, ResourceAllocation>();

    projectTasksData.forEach(project => {
      if (!project.task_data?.data) return;

      project.task_data.data.forEach(task => {
        if (!task.start_date || !task.end_date || !task.resource_ids || task.resource_ids.length === 0) {
          return;
        }

        const taskStartDate = new Date(task.start_date.split(' ')[0]);
        const taskEndDate = new Date(task.end_date.split(' ')[0]);

        task.resource_ids.forEach((resourceId, index) => {
          const resourceName = task.resource_names?.[index] || 'Unknown';
          const workHours = task.resource_work_hours?.[resourceId] || 0;

          if (workHours === 0) return;

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

          weeklyHours.forEach((hours, weekKey) => {
            const currentHours = allocation.weeklyAllocations.get(weekKey) || 0;
            allocation.weeklyAllocations.set(weekKey, currentHours + hours);
          });

          allocation.totalHours += workHours;
        });
      });
    });

    setAllocations(Array.from(resourceAllocationsMap.values()).sort((a, b) =>
      a.resourceName.localeCompare(b.resourceName)
    ));
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

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
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
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getWeekKey = (date: Date): string => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return startOfWeek.toISOString().split('T')[0];
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
      const weekKey = weekDate.toISOString().split('T')[0];
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
    if (hours <= 10) return 'bg-green-100 text-green-800';
    if (hours <= 20) return 'bg-yellow-100 text-yellow-800';
    if (hours <= 30) return 'bg-orange-100 text-orange-800';
    if (hours <= 40) return 'bg-red-100 text-red-800';
    return 'bg-red-200 text-red-900 font-bold';
  };

  const getCapacityIndicator = (hours: number): string => {
    const weeklyCapacity = 40;
    const percentage = (hours / weeklyCapacity) * 100;

    if (percentage === 0) return '';
    if (percentage <= 50) return '🟢';
    if (percentage <= 80) return '🟡';
    if (percentage <= 100) return '🟠';
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[200px]">
                  Resource
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[100px]">
                  Total Hours
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
                      <span className="font-semibold">{allocation.totalHours.toFixed(1)}</span>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <span>🟢</span>
            <span className="text-sm text-gray-600">0-50% (0-20 hrs/week)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟡</span>
            <span className="text-sm text-gray-600">50-80% (20-32 hrs/week)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟠</span>
            <span className="text-sm text-gray-600">80-100% (32-40 hrs/week)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔴</span>
            <span className="text-sm text-gray-600">Over 100% (40+ hrs/week)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Weekly capacity assumed at 40 hours. Hours are distributed across working days (Mon-Fri) within the task date range.
        </p>
      </div>
    </div>
  );
}
