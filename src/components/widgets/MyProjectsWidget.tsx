import { useState, useEffect } from 'react';
import { FolderKanban, AlertTriangle, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  state: string;
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
        .select('id, name, state, status, description')
        .in('id', projectIds)
        .in('state', ['Active', 'Planning'])
        .order('name')
        .limit(6);

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }

      // Map status to health_status for compatibility
      const projectsWithHealth = (data || []).map(p => ({
        ...p,
        health_status: p.status || 'On Track'
      }));

      setProjects(projectsWithHealth);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'On Track': return 'bg-green-500';
      case 'At Risk': return 'bg-yellow-500';
      case 'Delayed': case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthTextColor = (health: string) => {
    switch (health) {
      case 'On Track': return 'text-green-700';
      case 'At Risk': return 'text-yellow-700';
      case 'Delayed': case 'Critical': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  const atRiskCount = projects.filter(p =>
    p.health_status === 'At Risk' || p.health_status === 'Delayed' || p.health_status === 'Critical'
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
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-blue-600" />
          My Projects
        </h3>
        {atRiskCount > 0 && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {atRiskCount} at risk
          </span>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <FolderKanban className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No active projects</p>
          <p className="text-sm text-gray-500">
            You are not assigned as Project Manager on any projects
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 font-medium text-sm mb-1 truncate">{project.name}</h4>
                  {project.description && (
                    <p className="text-xs text-gray-600 truncate">{project.description}</p>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${getHealthColor(project.health_status)} flex-shrink-0 ml-2 mt-1`} />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                    {project.state}
                  </span>
                  <span className={`text-xs font-medium ${getHealthTextColor(project.health_status)}`}>
                    {project.health_status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {projects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{projects.length} active projects</span>
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
