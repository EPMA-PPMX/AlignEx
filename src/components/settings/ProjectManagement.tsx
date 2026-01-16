import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Archive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';
import { formatDate } from '../../lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  archived: boolean;
  archived_at?: string;
  created_at: string;
}

const ProjectManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchArchivedProjects();
  }, []);

  const fetchArchivedProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('archived', true)
        .order('archived_at', { ascending: false });

      if (error) {
        console.error('Error fetching archived projects:', error);
        showNotification('Error fetching archived projects', 'error');
      } else {
        setArchivedProjects(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error fetching archived projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setDeletingProjectId(projectId);

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        showNotification('Error deleting project: ' + error.message, 'error');
      } else {
        showNotification('Project deleted successfully', 'success');
        setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
        setDeleteConfirmProject(null);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error deleting project', 'error');
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Project Management</h2>
        <p className="text-gray-600 mt-2">
          Manage archived projects and permanently delete projects that are no longer needed.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">Warning</h3>
            <p className="text-sm text-amber-800 mt-1">
              Deleting a project is permanent and cannot be undone. All associated data including tasks,
              documents, and history will be permanently removed. Only delete projects that were created
              accidentally or have passed their retention period.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Archived Projects</h3>
          <span className="text-sm text-gray-500">
            {archivedProjects.length} {archivedProjects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading archived projects...</span>
          </div>
        ) : archivedProjects.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No archived projects found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{project.name}</h4>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        project.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                      <span>Created: {formatDate(project.created_at)}</span>
                      {project.archived_at && (
                        <span>Archived: {formatDate(project.archived_at)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmProject(project)}
                    disabled={deletingProjectId === project.id}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete project"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Project</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete <strong>{deleteConfirmProject.name}</strong>?
              This action cannot be undone and all associated data will be permanently removed.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800 font-medium">
                This will permanently delete:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4 list-disc">
                <li>All project tasks and assignments</li>
                <li>Documents and attachments</li>
                <li>Budget and financial data</li>
                <li>Change requests, risks, and issues</li>
                <li>Project history and audit logs</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                disabled={deletingProjectId !== null}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmProject.id)}
                disabled={deletingProjectId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deletingProjectId === deleteConfirmProject.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;
