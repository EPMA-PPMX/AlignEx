import { useState, useEffect } from 'react';
import { FolderKanban, AlertTriangle, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  state: string;
  status: string;
  health_status: string;
  description?: string;
}

export default function MyProjectsWidget() {
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      if (!user?.resource_id) {
        console.log('MyProjectsWidget: User has no resource_id, cannot fetch projects');
        setProjects([]);
        return;
      }

      // First, get the Project Manager field ID
      const { data: pmField, error: pmFieldError } = await supabase
        .from('custom_fields')
        .select('id')
        .eq('field_name', 'Project Manager')
        .eq('entity_type', 'project')
        .maybeSingle();

      if (pmFieldError) {
        console.error('Error fetching Project Manager field:', pmFieldError);
        throw pmFieldError;
      }

      if (!pmField) {
        console.log('MyProjectsWidget: Project Manager field not found');
        setProjects([]);
        return;
      }

      // Get all projects where the user is the Project Manager
      const { data: projectFieldValues, error: pfvError } = await supabase
        .from('project_field_values')
        .select('project_id')
        .eq('field_id', pmField.id)
        .eq('value', user.resource_id);

      if (pfvError) {
        console.error('Error fetching project field values:', pfvError);
        throw pfvError;
      }

      const projectIds = (projectFieldValues || []).map(pfv => pfv.project_id);

      console.log('MyProjectsWidget: Found', projectIds.length, 'projects where user is PM');

      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }

      // Fetch project details
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, state, status, health_status, description')
        .in('id', projectIds)
        .in('state', ['Active', 'Planning'])
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (healthStatus: string) => {
    switch (healthStatus?.toLowerCase()) {
      case 'on track': return 'bg-green-500';
      case 'at risk': return 'bg-yellow-500';
      case 'delayed': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthTextColor = (healthStatus: string) => {
    switch (healthStatus?.toLowerCase()) {
      case 'on track': return 'text-green-700';
      case 'at risk': return 'text-yellow-700';
      case 'delayed': return 'text-red-700';
      case 'completed': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  };

  const getHealthIcon = (healthStatus: string) => {
    switch (healthStatus?.toLowerCase()) {
      case 'on track':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'at risk':
        return <Minus className="w-4 h-4 text-yellow-600" />;
      case 'delayed':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'completed':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const healthCounts = projects.reduce((acc, project) => {
    const health = project.health_status?.toLowerCase() || 'unknown';
    acc[health] = (acc[health] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const atRiskCount = projects.filter(p =>
    p.health_status?.toLowerCase() === 'at risk' || p.health_status?.toLowerCase() === 'delayed'
  ).length;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            My Projects
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
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-blue-600" />
          My Projects
        </h3>
        <span className="text-xs text-gray-500">
          {projects.length} active
        </span>
      </div>

      {/* Health Summary KPIs */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">On Track</span>
            </div>
            <p className="text-2xl font-bold text-green-700 text-center">
              {healthCounts['on track'] || 0}
            </p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Minus className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-700">At Risk</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 text-center">
              {healthCounts['at risk'] || 0}
            </p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Delayed</span>
            </div>
            <p className="text-2xl font-bold text-red-700 text-center">
              {healthCounts['delayed'] || 0}
            </p>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <FolderKanban className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No active projects</p>
          <p className="text-sm text-gray-500">
            You are not assigned as Project Manager on any projects
          </p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getHealthIcon(project.health_status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {project.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {project.state}
                    </p>
                  </div>
                </div>
                {project.health_status && (
                  <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${getHealthColor(project.health_status)} ${getHealthTextColor(project.health_status).replace('text-', 'bg-').replace('-700', '-100')}`}>
                    {project.health_status}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {projects.length > 5 && (
        <Link
          to="/projects"
          className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2 mt-2 border-t border-gray-200"
        >
          View all {projects.length} projects
        </Link>
      )}
    </div>
  );
}
