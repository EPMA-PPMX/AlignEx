import React from 'react';
import { Calendar, Users, MoreHorizontal, AlertCircle, CheckCircle, Clock, PlayCircle } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  progress: number;
  dueDate: string;
  team: string[];
  priority: string;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'at risk':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <PlayCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'at risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'border-red-500';
      case 'medium':
        return 'border-yellow-500';
      case 'low':
        return 'border-green-500';
      default:
        return 'border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`bg-widget-bg rounded-lg shadow-sm border-l-4 ${getPriorityColor(project.priority)} hover:shadow-md transition-shadow`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
          <button className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
        
        <div className="flex items-center justify-between mb-4">
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
            {getStatusIcon(project.status)}
            <span className="ml-1">{project.status}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            project.priority === 'high' ? 'bg-red-50 text-red-700' :
            project.priority === 'medium' ? 'bg-yellow-50 text-yellow-700' :
            'bg-green-50 text-green-700'
          }`}>
            {project.priority.toUpperCase()}
          </span>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(project.dueDate)}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            <span>{project.team.length} members</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex -space-x-2">
            {project.team.slice(0, 3).map((member, index) => (
              <div
                key={index}
                className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                title={member}
              >
                {member.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            ))}
            {project.team.length > 3 && (
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-700 text-xs font-medium border-2 border-white">
                +{project.team.length - 3}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;