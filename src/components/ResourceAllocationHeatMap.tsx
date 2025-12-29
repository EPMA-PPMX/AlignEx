import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar } from 'lucide-react';

interface Task {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
  estimated_hours: number;
}

interface Assignment {
  id: string;
  resource_id: string;
  task_id: string;
  allocated_hours: number;
  project_tasks: Task;
}

interface Resource {
  id: string;
  display_name: string;
}

interface WeekAllocation {
  weekKey: string;
  weekLabel: string;
  hours: number;
}

interface ResourceAllocation {
  resource: Resource;
  weeklyHours: Map<string, number>;
}

export default function ResourceAllocationHeatMap() {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResourceAllocations();
  }, []);

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const getWorkingDaysBetween = (startDate: Date, endDate: Date): Date[] => {
    const workingDays: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      if (!isWeekend(current)) {
        workingDays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  };

  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  const getWeekLabel = (weekKey: string): string => {
    const [year, week] = weekKey.split('-W');
    const weekNum = parseInt(week);

    const firstDayOfYear = new Date(parseInt(year), 0, 1);
    const daysOffset = (weekNum - 1) * 7;
    const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 86400000);

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `Week ${weekNum} (${weekStart.toLocaleDateString('en-US', options)})`;
  };

  const fetchResourceAllocations = async () => {
    try {
      setLoading(true);

      const { data: assignments, error } = await supabase
        .from('task_resource_assignments')
        .select(`
          id,
          resource_id,
          task_id,
          allocated_hours,
          project_tasks (
            id,
            task_name,
            start_date,
            end_date,
            estimated_hours
          )
        `);

      if (error) throw error;

      const { data: resources, error: resourcesError } = await supabase
        .from('resources')
        .select('id, display_name')
        .eq('status', 'active')
        .order('display_name');

      if (resourcesError) throw resourcesError;

      const resourceMap = new Map<string, ResourceAllocation>();
      const allWeeks = new Set<string>();

      (assignments as Assignment[])?.forEach((assignment) => {
        if (!assignment.project_tasks) return;

        const task = assignment.project_tasks;
        const resourceId = assignment.resource_id;
        const allocatedHours = assignment.allocated_hours;

        if (!task.start_date || !task.end_date) return;

        const startDate = new Date(task.start_date);
        const endDate = new Date(task.end_date);

        const workingDays = getWorkingDaysBetween(startDate, endDate);

        if (workingDays.length === 0) return;

        const hoursPerDay = allocatedHours / workingDays.length;

        const weekHours = new Map<string, number>();
        workingDays.forEach((day) => {
          const weekKey = getWeekKey(day);
          weekHours.set(weekKey, (weekHours.get(weekKey) || 0) + hoursPerDay);
          allWeeks.add(weekKey);
        });

        if (!resourceMap.has(resourceId)) {
          const resource = resources?.find(r => r.id === resourceId);
          if (!resource) return;

          resourceMap.set(resourceId, {
            resource,
            weeklyHours: new Map()
          });
        }

        const resourceAllocation = resourceMap.get(resourceId)!;
        weekHours.forEach((hours, weekKey) => {
          resourceAllocation.weeklyHours.set(
            weekKey,
            (resourceAllocation.weeklyHours.get(weekKey) || 0) + hours
          );
        });
      });

      const sortedWeeks = Array.from(allWeeks).sort();
      setWeeks(sortedWeeks);

      const resourceAllocations = Array.from(resourceMap.values());
      setAllocations(resourceAllocations);
    } catch (error) {
      console.error('Error fetching resource allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClass = (hours: number): string => {
    if (hours === 0) return 'bg-gray-100 text-gray-400';
    if (hours <= 10) return 'bg-green-100 text-green-800';
    if (hours <= 20) return 'bg-yellow-100 text-yellow-800';
    if (hours <= 30) return 'bg-orange-100 text-orange-800';
    if (hours <= 40) return 'bg-red-100 text-red-800';
    return 'bg-red-200 text-red-900 font-bold';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading resource allocations...</div>
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Resource Allocation Heat Map</h2>
        </div>
        <div className="text-center py-8 text-gray-500">
          No resource allocations found. Assign resources to tasks to see the heat map.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Resource Allocation Heat Map</h2>
        <span className="text-sm text-gray-500 ml-auto">Weekly hours (Monday-Friday)</span>
      </div>

      <div className="mb-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-100 border border-green-200 rounded"></div>
          <span className="text-gray-600">1-10h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-100 border border-yellow-200 rounded"></div>
          <span className="text-gray-600">11-20h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-100 border border-orange-200 rounded"></div>
          <span className="text-gray-600">21-30h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 border border-red-200 rounded"></div>
          <span className="text-gray-600">31-40h</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-200 border border-red-300 rounded"></div>
          <span className="text-gray-600">40h+</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200">
                Resource
              </th>
              {weeks.map((weekKey) => (
                <th
                  key={weekKey}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 min-w-[100px]"
                >
                  {getWeekLabel(weekKey)}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-l border-gray-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allocations.map((allocation) => {
              const totalHours = Array.from(allocation.weeklyHours.values()).reduce((sum, h) => sum + h, 0);

              return (
                <tr key={allocation.resource.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 hover:bg-gray-50">
                    {allocation.resource.display_name}
                  </td>
                  {weeks.map((weekKey) => {
                    const hours = allocation.weeklyHours.get(weekKey) || 0;
                    return (
                      <td
                        key={weekKey}
                        className={`px-3 py-3 text-center text-sm font-semibold border-r border-gray-100 ${getColorClass(hours)}`}
                      >
                        {hours > 0 ? `${Math.round(hours)}h` : '-'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 border-l border-gray-200 bg-gray-50">
                    {Math.round(totalHours)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Hours are distributed evenly across working days (Monday-Friday) within each task's date range.
        Each cell shows the total hours allocated to that resource for that week.
      </div>
    </div>
  );
}
