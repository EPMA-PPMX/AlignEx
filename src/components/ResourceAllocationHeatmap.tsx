import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';

interface TeamMember {
  id: string;
  member_name: string;
  allocation_percentage: number;
  start_date: string;
  end_date: string | null;
}

interface Task {
  id: number;
  text: string;
  start_date: string;
  duration: number;
  owner?: string;
}

interface ResourceAllocationHeatmapProps {
  teamMembers: TeamMember[];
  tasks: Task[];
  weeksToShow?: number;
}

export default function ResourceAllocationHeatmap({
  teamMembers,
  tasks,
  weeksToShow = 12
}: ResourceAllocationHeatmapProps) {
  const { weeks, memberAllocations } = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const weeks = Array.from({ length: weeksToShow }, (_, i) => {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() + (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return { start: weekStart, end: weekEnd };
    });

    const memberAllocations = teamMembers.map(member => {
      const weeklyAllocations = weeks.map(week => {
        const tasksInWeek = tasks.filter(task => {
          if (!task.owner || task.owner !== member.member_name) return false;

          const taskStart = new Date(task.start_date.split(' ')[0]);
          const taskEnd = new Date(taskStart);
          taskEnd.setDate(taskStart.getDate() + task.duration);

          return (
            (taskStart <= week.end && taskEnd >= week.start)
          );
        });

        const memberStartDate = new Date(member.start_date);
        const memberEndDate = member.end_date ? new Date(member.end_date) : null;

        const isInProjectPeriod = memberStartDate <= week.end &&
          (!memberEndDate || memberEndDate >= week.start);

        if (!isInProjectPeriod) {
          return 0;
        }

        const totalTasksAllocation = tasksInWeek.length * 25;

        return Math.min(totalTasksAllocation, 100);
      });

      return {
        member,
        allocations: weeklyAllocations
      };
    });

    return { weeks, memberAllocations };
  }, [teamMembers, tasks, weeksToShow]);

  const getHeatmapColor = (allocation: number): string => {
    if (allocation === 0) return 'bg-gray-100';
    if (allocation <= 25) return 'bg-green-200';
    if (allocation <= 50) return 'bg-green-400';
    if (allocation <= 75) return 'bg-yellow-400';
    if (allocation < 100) return 'bg-orange-400';
    return 'bg-red-500';
  };

  const formatWeekRange = (start: Date, end: Date): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (start.getMonth() === end.getMonth()) {
      return `${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}`;
    }
    return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}`;
  };

  if (teamMembers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members Yet</h3>
        <p className="text-gray-500">Add team members to see the resource allocation heatmap</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Resource Allocation Heatmap
        </h3>
        <p className="text-sm text-gray-500">
          Visual representation of team workload across project weeks
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r border-gray-200 min-w-[150px]">
                  Team Member
                </th>
                {weeks.map((week, index) => (
                  <th
                    key={index}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 border-b border-gray-200 min-w-[100px]"
                  >
                    <div className="whitespace-nowrap">
                      {formatWeekRange(week.start, week.end)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberAllocations.map(({ member, allocations }) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-4 py-3 border-r border-b border-gray-200">
                    <div className="font-medium text-gray-900">{member.member_name}</div>
                    <div className="text-xs text-gray-500">{member.allocation_percentage}% allocated</div>
                  </td>
                  {allocations.map((allocation, weekIndex) => (
                    <td
                      key={weekIndex}
                      className="border-b border-gray-200"
                    >
                      <div
                        className={`h-16 ${getHeatmapColor(allocation)} transition-colors flex items-center justify-center`}
                        title={`${allocation}% allocated`}
                      >
                        {allocation > 0 && (
                          <span className="text-xs font-semibold text-gray-700">
                            {allocation}%
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded"></div>
          <span className="text-gray-600">0%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-200 border border-gray-300 rounded"></div>
          <span className="text-gray-600">1-25%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-400 border border-gray-300 rounded"></div>
          <span className="text-gray-600">26-50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-yellow-400 border border-gray-300 rounded"></div>
          <span className="text-gray-600">51-75%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-400 border border-gray-300 rounded"></div>
          <span className="text-gray-600">76-99%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-500 border border-gray-300 rounded"></div>
          <span className="text-gray-600">100%+</span>
        </div>
      </div>
    </div>
  );
}
