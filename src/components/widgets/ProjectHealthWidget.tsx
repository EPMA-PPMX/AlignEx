import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  status: string;
  health_status: string;
}

export default function ProjectHealthWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, health_status')
        .neq('status', 'completed')
        .order('name');

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'on_track':
        return 'bg-green-100 text-green-700';
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-700';
      case 'off_track':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'on_track':
        return <TrendingUp className="w-4 h-4" />;
      case 'at_risk':
        return <Minus className="w-4 h-4" />;
      case 'off_track':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getHealthLabel = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'on_track':
        return 'On Track';
      case 'at_risk':
        return 'At Risk';
      case 'off_track':
        return 'Off Track';
      default:
        return 'Unknown';
    }
  };

  const healthCounts = projects.reduce((acc, project) => {
    const health = project.health_status?.toLowerCase() || 'unknown';
    acc[health] = (acc[health] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Project Health
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Project Health
        </h3>
        <span className="text-xs text-gray-500">
          {projects.length} active
        </span>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">On Track</span>
          </div>
          <p className="text-2xl font-bold text-green-700 text-center">
            {healthCounts.on_track || 0}
          </p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Minus className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700 text-center">
            {healthCounts.at_risk || 0}
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-red-700">Off Track</span>
          </div>
          <p className="text-2xl font-bold text-red-700 text-center">
            {healthCounts.off_track || 0}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Activity className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No active projects</p>
          <p className="text-sm text-gray-500">Start a project to track health</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {projects.slice(0, 5).map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getHealthIcon(project.health_status)}
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {project.name}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${getHealthColor(project.health_status)}`}>
                  {getHealthLabel(project.health_status)}
                </span>
              </div>
            </Link>
          ))}
          {projects.length > 5 && (
            <Link
              to="/projects"
              className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
            >
              View all {projects.length} projects
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
