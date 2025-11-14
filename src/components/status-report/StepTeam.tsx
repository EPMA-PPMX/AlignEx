import { useState, useEffect } from 'react';
import { Users, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

interface TeamMember {
  id: string;
  resource_id: string;
  role: string;
  allocation_percentage: number;
  resource: {
    name: string;
    email: string;
  };
  out_of_office_start?: string;
  out_of_office_end?: string;
  notes?: string;
}

export default function StepTeam({ reportData, updateReportData }: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportData.projectId) {
      loadTeamMembers();
    }
  }, [reportData.projectId]);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error} = await supabase
        .from('project_team_members')
        .select(`
          *,
          resource:resources(name, email)
        `)
        .eq('project_id', reportData.projectId)
        .order('created_at');

      if (error) throw error;
      setTeamMembers((data || []).map((tm: any) => ({
        ...tm,
        out_of_office_start: '',
        out_of_office_end: '',
        notes: '',
      })));
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = (index: number, field: string, value: any) => {
    const updated = [...teamMembers];
    updated[index] = { ...updated[index], [field]: value };
    setTeamMembers(updated);
  };

  const getWorkloadColor = (allocation: number) => {
    if (allocation >= 100) return 'text-red-600 font-semibold';
    if (allocation >= 80) return 'text-orange-600 font-semibold';
    if (allocation >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Availability</h2>
        <p className="text-gray-600">Review team workload and capture out-of-office time</p>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Loading team members...</p>
        </div>
      ) : teamMembers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No team members assigned to this project</p>
          <p className="text-sm text-gray-500 mt-2">Assign team members in the project details page first</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teamMembers.map((member, index) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{member.resource.name}</h4>
                    <p className="text-sm text-gray-600">{member.resource.email}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-700"><strong>Role:</strong> {member.role}</span>
                      <span className={getWorkloadColor(member.allocation_percentage)}>
                        <strong>Allocation:</strong> {member.allocation_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4" />
                    Out of Office (This Week)
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={member.out_of_office_start || ''}
                        onChange={(e) => handleUpdateMember(index, 'out_of_office_start', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={member.out_of_office_end || ''}
                        onChange={(e) => handleUpdateMember(index, 'out_of_office_end', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={member.notes || ''}
                      onChange={(e) => handleUpdateMember(index, 'notes', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Vacation, sick leave, training, etc."
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Out-of-office information is for reporting purposes only and helps explain any delays or resource constraints during the week.
        </p>
      </div>
    </div>
  );
}
