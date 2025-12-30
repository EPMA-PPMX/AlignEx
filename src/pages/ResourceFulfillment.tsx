import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { X, Users, Calendar, Briefcase, Search, GripVertical, XCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotification } from '../lib/useNotification';

interface Project {
  id: string;
  name: string;
  pending_count: number;
  status?: string;
}

interface TaskWithGenericResources {
  id: string;
  task_name: string;
  start_date: string | null;
  end_date: string | null;
  task_data: any;
  project_id: string;
  project_name: string;
  generic_resources: GenericResourceAssignment[];
  is_fulfilled: boolean;
}

interface GenericResourceAssignment {
  resource_id: string;
  resource_name: string;
  allocated_hours: number;
  roles: string[];
}

interface Resource {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  department: string | null;
  status: string;
  resource_type: string;
}

interface QuickAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  task: TaskWithGenericResources | null;
  genericResource: GenericResourceAssignment | null;
  onConfirm: (allocatedHours: number) => void;
}

const QuickAssignModal: React.FC<QuickAssignModalProps> = ({
  isOpen,
  onClose,
  resource,
  task,
  genericResource,
  onConfirm,
}) => {
  const [allocatedHours, setAllocatedHours] = useState(100);

  useEffect(() => {
    if (genericResource) {
      setAllocatedHours(genericResource.allocated_hours);
    }
  }, [genericResource]);

  if (!isOpen || !resource || !task || !genericResource) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Confirm Resource Assignment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Assigning Resource</h3>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {resource.first_name?.[0]}{resource.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">{resource.display_name}</p>
                <p className="text-sm text-gray-500">{resource.email}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Replacing Generic Resource</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                  {genericResource.resource_name.charAt(0)}
                </div>
                <p className="font-medium text-gray-700">{genericResource.resource_name}</p>
              </div>
              <span className="text-sm text-gray-500">{genericResource.allocated_hours}%</span>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Task Details</h3>
            <div className="space-y-2">
              <div className="flex items-start">
                <Briefcase className="w-4 h-4 text-gray-400 mt-1 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{task.task_name}</p>
                  <p className="text-xs text-gray-500">{task.project_name}</p>
                </div>
              </div>
              {task.start_date && task.end_date && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(task.start_date).toLocaleDateString()} - {new Date(task.end_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allocation Percentage
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={allocatedHours}
                onChange={(e) => setAllocatedHours(Number(e.target.value))}
                min="0"
                max="300"
                step="10"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              100% = 1 FTE, 200% = 2 FTE
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(allocatedHours)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
};

const DraggableResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: resource.id,
    data: resource,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`p-3 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <GripVertical className="w-4 h-4 text-gray-400" />
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
          {resource.first_name?.[0]}{resource.last_name?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{resource.display_name}</p>
          <p className="text-xs text-gray-500 truncate">{resource.department || 'No Department'}</p>
          {resource.roles && resource.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {resource.roles.slice(0, 2).map((role, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {role}
                </span>
              ))}
              {resource.roles.length > 2 && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  +{resource.roles.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DroppableTaskCard: React.FC<{ task: TaskWithGenericResources }> = ({ task }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: task.id,
    data: task,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 bg-white border-2 rounded-lg transition-all ${
        isOver
          ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
          : task.is_fulfilled
          ? 'border-green-200 hover:border-green-300'
          : 'border-red-200 hover:border-red-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{task.task_name}</h3>
          <p className="text-xs text-gray-500">{task.project_name}</p>
        </div>
        {task.is_fulfilled ? (
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        )}
      </div>

      {task.start_date && task.end_date && (
        <div className="flex items-center text-xs text-gray-600 mb-3">
          <Calendar className="w-3 h-3 mr-1" />
          <span>{new Date(task.start_date).toLocaleDateString()} - {new Date(task.end_date).toLocaleDateString()}</span>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700">Generic Resources:</p>
        {task.generic_resources.map((gr, idx) => (
          <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-semibold">
                {gr.resource_name.charAt(0)}
              </div>
              <div>
                <p className="text-sm text-gray-900">{gr.resource_name}</p>
                {gr.roles && gr.roles.length > 0 && (
                  <p className="text-xs text-gray-500">{gr.roles.join(', ')}</p>
                )}
              </div>
            </div>
            <span className="text-xs font-medium text-gray-600">{gr.allocated_hours}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ResourceFulfillment() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskWithGenericResources[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithGenericResources | null>(null);
  const [selectedGenericResource, setSelectedGenericResource] = useState<GenericResourceAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchProjectsWithPendingFulfillments();
    fetchAllResources();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasksForProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    applyFilters();
  }, [resources, searchTerm, roleFilter]);

  const fetchProjectsWithPendingFulfillments = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('project_tasks')
        .select('id, project_id, task_data, projects(id, name, status)');

      if (tasksError) throw tasksError;

      const projectMap = new Map<string, { name: string; count: number; status?: string }>();

      tasksData?.forEach((task) => {
        const taskData = task.task_data || {};
        const resourceIds = taskData.resource_ids || [];
        const resourceNames = taskData.resource_names || [];

        const genericResources = [];
        for (let i = 0; i < resourceIds.length; i++) {
          const resourceId = resourceIds[i];
          const resourceName = resourceNames[i];

          if (resourceName && (resourceName.includes('Generic') || resourceName.includes('generic'))) {
            genericResources.push({ resourceId, resourceName });
          }
        }

        if (genericResources.length > 0) {
          const project = (task as any).projects;
          if (project && (project.status === 'In Progress' || !project.status)) {
            if (!projectMap.has(project.id)) {
              projectMap.set(project.id, { name: project.name, count: 0, status: project.status });
            }
            const projectData = projectMap.get(project.id)!;
            projectData.count += genericResources.length;
          }
        }
      });

      const projectsList: Project[] = Array.from(projectMap.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        pending_count: data.count,
        status: data.status,
      }));

      setProjects(projectsList);
      if (projectsList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectsList[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      showNotification('Error loading projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksForProject = async (projectId: string) => {
    try {
      const { data: tasksData, error } = await supabase
        .from('project_tasks')
        .select('id, task_name, start_date, end_date, task_data, project_id, projects(name)')
        .eq('project_id', projectId);

      if (error) throw error;

      const tasksWithGeneric: TaskWithGenericResources[] = [];

      for (const task of tasksData || []) {
        const taskData = task.task_data || {};
        const resourceIds = taskData.resource_ids || [];
        const resourceNames = taskData.resource_names || [];

        const genericResources: GenericResourceAssignment[] = [];

        for (let i = 0; i < resourceIds.length; i++) {
          const resourceId = resourceIds[i];
          const resourceName = resourceNames[i];

          if (resourceName && (resourceName.includes('Generic') || resourceName.includes('generic'))) {
            const { data: resourceData } = await supabase
              .from('resources')
              .select('roles')
              .eq('id', resourceId)
              .single();

            genericResources.push({
              resource_id: resourceId,
              resource_name: resourceName,
              allocated_hours: 100,
              roles: resourceData?.roles || [],
            });
          }
        }

        if (genericResources.length > 0) {
          tasksWithGeneric.push({
            id: task.id,
            task_name: task.task_name || 'Untitled Task',
            start_date: task.start_date,
            end_date: task.end_date,
            task_data: taskData,
            project_id: task.project_id,
            project_name: (task as any).projects?.name || 'Unknown Project',
            generic_resources: genericResources,
            is_fulfilled: false,
          });
        }
      }

      setTasks(tasksWithGeneric);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showNotification('Error loading tasks', 'error');
    }
  };

  const fetchAllResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('resource_type', 'person')
        .eq('status', 'active')
        .order('display_name');

      if (error) throw error;

      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      showNotification('Error loading resources', 'error');
    }
  };

  const applyFilters = () => {
    let filtered = [...resources];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.display_name.toLowerCase().includes(search) ||
          r.email?.toLowerCase().includes(search) ||
          r.department?.toLowerCase().includes(search)
      );
    }

    if (roleFilter.length > 0) {
      filtered = filtered.filter((r) =>
        r.roles?.some((role) => roleFilter.includes(role))
      );
    }

    setFilteredResources(filtered);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const resource = active.data.current as Resource;
    const task = over.data.current as TaskWithGenericResources;

    if (task && task.generic_resources.length > 0) {
      setSelectedResource(resource);
      setSelectedTask(task);
      setSelectedGenericResource(task.generic_resources[0]);
      setIsModalOpen(true);
    }
  };

  const handleConfirmAssignment = async (allocatedHours: number) => {
    if (!selectedResource || !selectedTask || !selectedGenericResource) return;

    try {
      const taskData = { ...selectedTask.task_data };
      const resourceIds = [...(taskData.resource_ids || [])];
      const resourceNames = [...(taskData.resource_names || [])];

      const genericIndex = resourceIds.findIndex(id => id === selectedGenericResource.resource_id);

      if (genericIndex !== -1) {
        resourceIds[genericIndex] = selectedResource.id;
        resourceNames[genericIndex] = selectedResource.display_name;
      }

      taskData.resource_ids = resourceIds;
      taskData.resource_names = resourceNames;

      const { error: updateError } = await supabase
        .from('project_tasks')
        .update({ task_data: taskData })
        .eq('id', selectedTask.id);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('resource_fulfillment_history')
        .insert({
          task_id: selectedTask.id,
          generic_resource_id: selectedGenericResource.resource_id,
          generic_resource_name: selectedGenericResource.resource_name,
          named_resource_id: selectedResource.id,
          named_resource_name: selectedResource.display_name,
          allocated_hours: allocatedHours,
        });

      if (historyError) throw historyError;

      showNotification('Resource assigned successfully', 'success');
      setIsModalOpen(false);
      setSelectedResource(null);
      setSelectedTask(null);
      setSelectedGenericResource(null);

      await fetchProjectsWithPendingFulfillments();
      if (selectedProjectId) {
        await fetchTasksForProject(selectedProjectId);
      }
    } catch (error) {
      console.error('Error assigning resource:', error);
      showNotification('Error assigning resource', 'error');
    }
  };

  const handleTaskClick = (task: TaskWithGenericResources) => {
    if (task.generic_resources.length > 0) {
      const roles = task.generic_resources[0].roles || [];
      setRoleFilter(roles);
    }
  };

  const clearRoleFilter = () => {
    setRoleFilter([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resource fulfillment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Fulfillment</h1>
            <p className="text-sm text-gray-600 mt-1">
              Drag named resources onto tasks to fulfill generic resource requests
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-gray-600">Pending</span>
              </div>
              <div className="flex items-center ml-4">
                <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-gray-600">Fulfilled</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/4 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Projects ({projects.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {projects.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No pending fulfillments</p>
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      selectedProjectId === project.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{project.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {project.pending_count} pending {project.pending_count === 1 ? 'request' : 'requests'}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                          {project.pending_count}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Tasks Requiring Fulfillment
              </h2>
              <p className="text-sm text-gray-600">
                Click a task to auto-filter resources by role, then drag a resource to assign
              </p>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">No tasks with generic resources in this project</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tasks.map((task) => (
                  <div key={task.id} onClick={() => handleTaskClick(task)}>
                    <DroppableTaskCard task={task} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-1/4 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Available Resources
              </h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {roleFilter.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-900">Role Filter Active</span>
                    <button
                      onClick={clearRoleFilter}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {roleFilter.map((role, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredResources.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No resources found</p>
                  {roleFilter.length > 0 && (
                    <button
                      onClick={clearRoleFilter}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                filteredResources.map((resource) => (
                  <DraggableResourceCard key={resource.id} resource={resource} />
                ))
              )}
            </div>
          </div>
        </div>
      </DndContext>

      <QuickAssignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resource={selectedResource}
        task={selectedTask}
        genericResource={selectedGenericResource}
        onConfirm={handleConfirmAssignment}
      />
    </div>
  );
}
