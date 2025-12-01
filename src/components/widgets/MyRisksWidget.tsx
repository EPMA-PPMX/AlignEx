import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Risk {
  id: string;
  project_id: string;
  title: string;
  impact: string;
  probability: number;
  status: string;
  assigned_to: string;
  project_name: string;
}

export default function MyRisksWidget() {
  const { user } = useCurrentUser();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRisks();
    }
  }, [user]);

  const fetchRisks = async () => {
    try {
      setLoading(true);

      if (!user?.resource_id) {
        console.log('MyRisksWidget: User has no resource_id, cannot fetch risks');
        setRisks([]);
        return;
      }

      const { data: pmField, error: pmFieldError } = await supabase
        .from('custom_fields')
        .select('id')
        .eq('field_name', 'Project Manager')
        .eq('entity_type', 'project')
        .maybeSingle();

      if (pmFieldError) throw pmFieldError;

      let projectIds: string[] = [];

      if (pmField) {
        const { data: projectFieldValues, error: pfvError } = await supabase
          .from('project_field_values')
          .select('project_id')
          .eq('field_id', pmField.id)
          .eq('value', user.resource_id);

        if (pfvError) throw pfvError;

        projectIds = (projectFieldValues || []).map(pfv => pfv.project_id);
      }

      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('project_id')
        .eq('resource_id', user.resource_id);

      if (teamError) throw teamError;

      const teamProjectIds = (teamData || []).map(t => t.project_id);
      projectIds = [...new Set([...projectIds, ...teamProjectIds])];

      if (projectIds.length === 0) {
        setRisks([]);
        return;
      }

      const { data: risksData, error: risksError } = await supabase
        .from('project_risks')
        .select('*, projects(name)')
        .in('project_id', projectIds)
        .in('status', ['Open', 'Active', 'Monitoring'])
        .order('probability', { ascending: false })
        .limit(5);

      if (risksError) throw risksError;

      const formattedRisks = (risksData || []).map((risk: any) => ({
        ...risk,
        project_name: risk.projects?.name || 'Unknown Project'
      }));

      setRisks(formattedRisks);
    } catch (err) {
      console.error('Error fetching risks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'critical': case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getImpactTextColor = (impact: string) => {
    switch (impact?.toLowerCase()) {
      case 'critical': case 'high': return 'text-red-700';
      case 'medium': return 'text-yellow-700';
      case 'low': return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  const highRiskCount = risks.filter(r =>
    r.impact?.toLowerCase() === 'critical' || r.impact?.toLowerCase() === 'high'
  ).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            My Risks
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          My Risks
        </h3>
        {highRiskCount > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {highRiskCount} high
          </span>
        )}
      </div>

      {risks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No active risks</p>
          <p className="text-sm text-gray-500">
            You have no open risks assigned to you
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {risks.map((risk) => (
            <Link
              key={risk.id}
              to={`/projects/${risk.project_id}`}
              className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 font-medium text-sm mb-1 truncate">{risk.title}</h4>
                  <p className="text-xs text-gray-600 truncate">{risk.project_name}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${getImpactColor(risk.impact)} flex-shrink-0 ml-2 mt-1`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getImpactTextColor(risk.impact)}`}>
                    {risk.impact}
                  </span>
                  <span className="text-xs text-gray-600">
                    {risk.probability}% probability
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                  {risk.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {risks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{risks.length} active risks</span>
            <Link
              to="/projects"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
