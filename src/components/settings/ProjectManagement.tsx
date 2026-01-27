import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Archive, FileText, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';
import { formatDate } from '../../lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
  health_status: string;
  archived: boolean;
  archived_at?: string;
  created_at: string;
}

interface ProjectRequest {
  id: string;
  project_name: string;
  description?: string;
  requestor_name?: string;
  status: string;
  priority: string;
  created_at: string;
}

const ProjectManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'archived' | 'requests'>('archived');
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [projectRequests, setProjectRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showDeleteRequestsConfirm, setShowDeleteRequestsConfirm] = useState(false);
  const [deletingRequests, setDeletingRequests] = useState(false);

  useEffect(() => {
    if (activeTab === 'archived') {
      fetchArchivedProjects();
    } else {
      fetchProjectRequests();
    }
  }, [activeTab]);

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

  const fetchProjectRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_initiation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project requests:', error);
        showNotification('Error fetching project requests', 'error');
      } else {
        setProjectRequests(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error fetching project requests', 'error');
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

  const toggleRequestSelection = (requestId: string) => {
    setSelectedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const toggleAllRequests = () => {
    if (selectedRequests.size === projectRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(projectRequests.map(r => r.id)));
    }
  };

  const handleDeleteRequests = async () => {
    try {
      setDeletingRequests(true);

      const { error } = await supabase
        .from('project_initiation_requests')
        .delete()
        .in('id', Array.from(selectedRequests));

      if (error) {
        console.error('Error deleting requests:', error);
        showNotification('Error deleting requests: ' + error.message, 'error');
      } else {
        const count = selectedRequests.size;
        showNotification(`${count} request${count > 1 ? 's' : ''} deleted successfully`, 'success');
        setProjectRequests(prev => prev.filter(r => !selectedRequests.has(r.id)));
        setSelectedRequests(new Set());
        setShowDeleteRequestsConfirm(false);
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('Error deleting requests', 'error');
    } finally {
      setDeletingRequests(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Project Management</h2>
        <p className="text-gray-600 mt-2">
          Manage archived projects and project initiation requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'archived'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Archive className="w-4 h-4" />
            <span>Archived Projects</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'requests'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Project Requests</span>
          </div>
        </button>
      </div>

      {activeTab === 'archived' ? (
        <>
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
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            project.health_status === 'On Track' ? 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white border-[#5DB6B8]' :
                            project.health_status === 'At Risk' ? 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white border-[#F89D43]' :
                            project.health_status === 'Delayed' ? 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white border-[#FD5D5D]' :
                            project.health_status === 'Completed' ? 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white border-[#5DB6B8]' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.health_status || 'Not Set'}
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
        </>
      ) : (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">Warning</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Deleting project requests is permanent and cannot be undone. Only delete requests that
                  were created accidentally or are no longer needed.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Project Requests</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {projectRequests.length} {projectRequests.length === 1 ? 'request' : 'requests'}
                </span>
                {selectedRequests.size > 0 && (
                  <button
                    onClick={() => setShowDeleteRequestsConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Selected ({selectedRequests.size})</span>
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading project requests...</span>
              </div>
            ) : projectRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No project requests found</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRequests.size === projectRequests.length}
                      onChange={toggleAllRequests}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Select All</span>
                  </label>
                </div>

                {projectRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.id)}
                        onChange={() => toggleRequestSelection(request.id)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{request.project_name}</h4>
                        {request.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.status}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            request.priority === 'High' ? 'bg-red-100 text-red-800' :
                            request.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {request.priority} Priority
                          </span>
                          {request.requestor_name && (
                            <span>Requestor: {request.requestor_name}</span>
                          )}
                          <span>Created: {formatDate(request.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {deleteConfirmProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-widget-bg rounded-lg shadow-xl max-w-md w-full p-6">
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

      {showDeleteRequestsConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-widget-bg rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Project Requests</h3>
            </div>

            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete <strong>{selectedRequests.size}</strong> project request{selectedRequests.size > 1 ? 's' : ''}?
              This action cannot be undone.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
              <p className="text-sm text-red-800 font-medium">
                Selected requests will be permanently deleted. This includes all request details and cannot be recovered.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteRequestsConfirm(false)}
                disabled={deletingRequests}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequests}
                disabled={deletingRequests}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deletingRequests ? (
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
