import { useState, useEffect } from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Issue {
  id: string;
  project_id: string;
  title: string;
  priority: string;
  status: string;
  category: string;
  assigned_to: string;
  project_name: string;
}

export default function MyIssuesWidget() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);

      // Get user's resource_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('resource_id')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (userError || !userData?.resource_id) {
        console.log('MyIssuesWidget: User has no resource_id, cannot fetch issues');
        setIssues([]);
        setLoading(false);
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
          .eq('value', userData.resource_id);

        if (pfvError) throw pfvError;

        projectIds = (projectFieldValues || []).map(pfv => pfv.project_id);
      }

      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('project_id')
        .eq('resource_id', userData.resource_id);

      if (teamError) throw teamError;

      const teamProjectIds = (teamData || []).map(t => t.project_id);
      projectIds = [...new Set([...projectIds, ...teamProjectIds])];

      if (projectIds.length === 0) {
        setIssues([]);
        return;
      }

      const { data: issuesData, error: issuesError } = await supabase
        .from('project_issues')
        .select('*, projects(name)')
        .in('project_id', projectIds)
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(5);

      if (issuesError) throw issuesError;

      const formattedIssues = (issuesData || []).map((issue: any) => ({
        ...issue,
        project_name: issue.projects?.name || 'Unknown Project'
      }));

      setIssues(formattedIssues);
    } catch (err) {
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-[#A93226]';
      case 'high': return 'bg-[#D43E3E]';
      case 'medium': return 'bg-[#C76F21]';
      case 'low': return 'bg-[#4DB8AA]';
      default: return 'bg-[#7F8C8D]';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'text-[#A93226]';
      case 'high': return 'text-[#D43E3E]';
      case 'medium': return 'text-[#C76F21]';
      case 'low': return 'text-[#4DB8AA]';
      default: return 'text-[#7F8C8D]';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-[#D43E3E] bg-opacity-20 text-[#D43E3E]';
      case 'closed': return 'bg-[#276A6C] bg-opacity-20 text-[#276A6C]';
      default: return 'bg-[#7F8C8D] bg-opacity-20 text-[#7F8C8D]';
    }
  };

  const criticalCount = issues.filter(i =>
    i.priority?.toLowerCase() === 'critical' || i.priority?.toLowerCase() === 'high'
  ).length;

  if (loading) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            My Issues
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
    <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#D43E3E]" />
          My Issues
        </h3>
        {criticalCount > 0 && (
          <span className="px-2 py-1 bg-[#D43E3E] bg-opacity-20 text-[#D43E3E] text-xs rounded-full flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3" />
            {criticalCount} critical
          </span>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No active issues</p>
          <p className="text-sm text-gray-500">
            You have no open issues assigned to you
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              to={`/projects/${issue.project_id}`}
              className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-[#D43E3E] transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 font-medium text-sm mb-1 truncate">{issue.title}</h4>
                  <p className="text-xs text-gray-600 truncate">{issue.project_name}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${getPriorityColor(issue.priority)} flex-shrink-0 ml-2 mt-1`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getPriorityTextColor(issue.priority)}`}>
                    {issue.priority} Priority
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                  {issue.category || 'General'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{issues.length} active issues</span>
            <Link
              to="/projects"
              className="text-[#5B2C91] hover:text-[#4a2377] flex items-center gap-1"
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
