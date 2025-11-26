import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface TeamMember {
  id: string;
  full_name: string;
  allocation_percentage: number;
  project_count: number;
}

export default function TeamCapacityWidget() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamCapacity();
  }, []);

  const fetchTeamCapacity = async () => {
    try {
      setLoading(true);

      const { data: projectTeams, error: teamsError } = await supabase
        .from('project_team_members')
        .select(`
          user_id,
          allocation_percentage,
          project:projects!inner (
            id,
            status
          )
        `);

      if (teamsError) throw teamsError;

      const activeTeams = (projectTeams || []).filter(
        (team: any) => team.project?.status !== 'completed' && team.project?.status !== 'cancelled'
      );

      const capacityMap = activeTeams.reduce((acc: any, team: any) => {
        if (!acc[team.user_id]) {
          acc[team.user_id] = {
            user_id: team.user_id,
            total_allocation: 0,
            project_count: 0
          };
        }
        acc[team.user_id].total_allocation += team.allocation_percentage || 0;
        acc[team.user_id].project_count += 1;
        return acc;
      }, {});

      const userIds = Object.keys(capacityMap);
      if (userIds.length === 0) {
        setTeamMembers([]);
        return;
      }

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      const members = (users || []).map(user => ({
        id: user.id,
        full_name: user.full_name,
        allocation_percentage: capacityMap[user.id].total_allocation,
        project_count: capacityMap[user.id].project_count
      }));

      members.sort((a, b) => b.allocation_percentage - a.allocation_percentage);

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team capacity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityColor = (allocation: number) => {
    if (allocation >= 100) return 'bg-red-500';
    if (allocation >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCapacityStatus = (allocation: number) => {
    if (allocation >= 100) return 'Overallocated';
    if (allocation >= 80) return 'Near Capacity';
    return 'Available';
  };

  const getCapacityStatusColor = (allocation: number) => {
    if (allocation >= 100) return 'text-red-700 bg-red-100';
    if (allocation >= 80) return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
  };

  const overallocatedCount = teamMembers.filter(m => m.allocation_percentage >= 100).length;
  const nearCapacityCount = teamMembers.filter(m => m.allocation_percentage >= 80 && m.allocation_percentage < 100).length;
  const availableCount = teamMembers.filter(m => m.allocation_percentage < 80).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Capacity
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
          Team Capacity
        </h3>
        <div className="flex items-center gap-2">
          {overallocatedCount > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
              {overallocatedCount} over
            </span>
          )}
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-50 p-2 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 font-medium mb-1">Available</p>
          <p className="text-xl font-bold text-green-700">{availableCount}</p>
        </div>
        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-700 font-medium mb-1">Near Cap</p>
          <p className="text-xl font-bold text-yellow-700">{nearCapacityCount}</p>
        </div>
        <div className="bg-red-50 p-2 rounded-lg border border-red-200">
          <p className="text-xs text-red-700 font-medium mb-1">Over</p>
          <p className="text-xl font-bold text-red-700">{overallocatedCount}</p>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Users className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No team allocations</p>
          <p className="text-sm text-gray-500">Assign team members to projects</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-gray-50 p-3 rounded-lg border border-gray-200"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {member.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {member.project_count} {member.project_count === 1 ? 'project' : 'projects'}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${getCapacityStatusColor(member.allocation_percentage)}`}>
                  {member.allocation_percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getCapacityColor(member.allocation_percentage)}`}
                  style={{ width: `${Math.min(member.allocation_percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {getCapacityStatus(member.allocation_percentage)}
              </p>
            </div>
          ))}
          {teamMembers.length > 5 && (
            <Link
              to="/teams"
              className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
            >
              View all team members
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
