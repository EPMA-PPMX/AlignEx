import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { X, Users, Search, GripVertical, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Briefcase, Calendar, Filter } from 'lucide-react';
import { useNotification } from '../lib/useNotification';
import SearchableMultiSelect from '../components/SearchableMultiSelect';

interface Project {
  id: string;
  name: string;
  pending_count: number;
  status?: string;
  tasks: TaskWithGenericResources[];
}

interface TaskWithGenericResources {
  id: string;
  task_name: string;
  start_date: string;
  end_date: string;
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

const DroppableTaskBar: React.FC<{
  task: TaskWithGenericResources;
  timelineStart: Date;
  timelineEnd: Date;
  onTaskClick: (task: TaskWithGenericResources) => void;
  allTasks: TaskWithGenericResources[];
}> = ({ task, timelineStart, timelineEnd, onTaskClick, allTasks }) => {
  // Only make it droppable if it has generic resources (not fulfilled)
  const { setNodeRef, isOver } = useDroppable({
    id: task.id,
    data: task,
    disabled: task.is_fulfilled,
  });

  const taskStart = new Date(task.start_date);
  const taskEnd = new Date(task.end_date);

  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
  const startOffset = Math.max(0, Math.ceil((taskStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
  const duration = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = Math.min((duration / totalDays) * 100, 100 - leftPercent);

  // Calculate hours for tooltip display
  const totalAllocatedHours = task.generic_resources.reduce((sum, gr) => sum + (gr.allocated_hours || 0), 0);
  const taskDurationDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const taskDurationWeeks = Math.max(taskDurationDays / 7, 0.1);
  const hoursPerWeek = totalAllocatedHours / taskDurationWeeks;

  // Simplified overallocation check: if any resource has multiple overlapping tasks, it's overallocated
  const isOverallocated = task.generic_resources.some(genericResource => {
    // Find all tasks that have this same resource assigned (excluding the current task)
    const otherTasksWithThisResource = allTasks.filter(t =>
      t.id !== task.id && // Not the current task
      t.generic_resources.some(gr => gr.resource_id === genericResource.resource_id)
    );

    // Check if any other task overlaps with the current task
    const hasOverlap = otherTasksWithThisResource.some(otherTask => {
      const otherStart = new Date(otherTask.start_date);
      const otherEnd = new Date(otherTask.end_date);

      // Check if date ranges overlap
      // Tasks overlap if: otherStart <= taskEnd AND otherEnd >= taskStart
      return otherStart <= taskEnd && otherEnd >= taskStart;
    });

    return hasOverlap;
  });

  // Determine color based on allocation
  const getColorClasses = () => {
    if (isOver) {
      return 'bg-blue-500 shadow-lg scale-105 z-20 cursor-pointer';
    }

    if (task.is_fulfilled) {
      // Fulfilled tasks - striped pattern
      if (isOverallocated) {
        return 'bg-red-600 cursor-default'; // Red for fulfilled overallocated
      } else {
        return 'bg-green-600 cursor-default'; // Green for fulfilled normal
      }
    } else {
      // Pending tasks - solid color
      if (isOverallocated) {
        return 'bg-red-600 hover:bg-red-700 cursor-pointer'; // Red for pending overallocated
      } else {
        return 'bg-green-600 hover:bg-green-700 cursor-pointer'; // Green for pending normal
      }
    }
  };

  const tooltipText = `${task.task_name}
${task.generic_resources.map(gr => `${gr.resource_name}: ${gr.allocated_hours}h`).join('\n')}
Total: ${totalAllocatedHours}h over ${taskDurationWeeks.toFixed(1)} weeks (${hoursPerWeek.toFixed(1)}h/week)`;

  return (
    <div
      ref={setNodeRef}
      onClick={() => !task.is_fulfilled && onTaskClick(task)}
      style={{
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        backgroundImage: task.is_fulfilled
          ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 20px)'
          : undefined,
      }}
      className={`absolute h-8 rounded transition-all ${getColorClasses()}`}
      title={tooltipText}
    >
      <div className="px-2 h-full flex items-center justify-between text-white text-xs font-medium truncate">
        <span className="truncate">{task.task_name}</span>
        {isOver && !task.is_fulfilled && (
          <AlertCircle className="w-4 h-4 flex-shrink-0 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default function ResourceFulfillment() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithGenericResources | null>(null);
  const [selectedGenericResource, setSelectedGenericResource] = useState<GenericResourceAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const { showNotification } = useNotification();

  const timelineStart = currentPeriodStart;
  const timelineEnd = new Date(timelineStart);
  timelineEnd.setDate(timelineEnd.getDate() + 14);

  useEffect(() => {
    fetchAllProjectsAndTasks();
    fetchAllResources();
  }, [currentPeriodStart]);

  useEffect(() => {
    applyFilters();
  }, [resources, searchTerm, roleFilter]);

  const fetchAllProjectsAndTasks = async () => {
    try {
      setLoading(true);

      // Get all generic resources
      const { data: genericResourcesData, error: resourceError } = await supabase
        .from('resources')
        .select('id, display_name, roles')
        .eq('resource_type', 'generic');

      if (resourceError) throw resourceError;

      const genericResourcesMap = new Map(
        genericResourcesData?.map(r => [r.id, { name: r.display_name, roles: r.roles }]) || []
      );

      // Get all project tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('project_tasks')
        .select('id, task_name, start_date, end_date, task_data, project_id, projects(id, name, status)');

      if (tasksError) throw tasksError;

      const projectsMap = new Map<string, Project>();

      tasksData?.forEach((projectTask) => {
        const project = (projectTask as any).projects;
        if (!project || project.status === 'Completed' || project.status === 'Archived') {
          return;
        }

        const taskData = projectTask.task_data || {};
        const tasksArray = taskData.data || [];

        tasksArray.forEach((individualTask: any) => {
          // Only process tasks that have dates
          if (!individualTask.start_date || !individualTask.end_date) {
            return;
          }

          // Filter tasks to only show those that overlap with the current timeline
          const taskStart = new Date(individualTask.start_date);
          const taskEnd = new Date(individualTask.end_date);

          // Task overlaps if it starts before timeline ends AND ends after timeline starts
          const overlapsTimeline = taskStart <= timelineEnd && taskEnd >= timelineStart;

          if (!overlapsTimeline) {
            return;
          }

          const resourceIds = individualTask.resource_ids || [];
          const resourceNames = individualTask.resource_names || [];

          const genericResources: GenericResourceAssignment[] = [];
          let hasTasks = resourceIds.length > 0;

          for (let i = 0; i < resourceIds.length; i++) {
            const resourceId = resourceIds[i];
            const resourceName = resourceNames[i];

            if (resourceId && genericResourcesMap.has(resourceId)) {
              const resourceInfo = genericResourcesMap.get(resourceId);
              genericResources.push({
                resource_id: resourceId,
                resource_name: resourceName || resourceInfo?.name || 'Unknown Resource',
                allocated_hours: 100,
                roles: resourceInfo?.roles || [],
              });
            }
          }

          // Only show tasks that have resources assigned
          if (hasTasks) {
            // Initialize project if not exists
            if (!projectsMap.has(project.id)) {
              projectsMap.set(project.id, {
                id: project.id,
                name: project.name,
                status: project.status,
                pending_count: 0,
                tasks: [],
              });
            }

            const projectEntry = projectsMap.get(project.id)!;
            const isFulfilled = genericResources.length === 0;

            if (!isFulfilled) {
              projectEntry.pending_count += genericResources.length;
            }

            projectEntry.tasks.push({
              id: `${projectTask.id}_${individualTask.id}`,
              task_name: individualTask.text || 'Untitled Task',
              start_date: individualTask.start_date,
              end_date: individualTask.end_date,
              task_data: {
                projectTaskId: projectTask.id,
                individualTaskId: individualTask.id,
                fullTaskData: taskData,
              },
              project_id: project.id,
              project_name: project.name,
              generic_resources: genericResources,
              is_fulfilled: isFulfilled,
            });
          }
        });
      });

      const projectsList = Array.from(projectsMap.values());
      setProjects(projectsList);
    } catch (error) {
      console.error('Error fetching projects and tasks:', error);
      showNotification('Error loading data', 'error');
    } finally {
      setLoading(false);
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
      const projectTaskId = selectedTask.task_data.projectTaskId;
      const individualTaskId = selectedTask.task_data.individualTaskId;
      const fullTaskData = { ...selectedTask.task_data.fullTaskData };

      const tasksArray = fullTaskData.data || [];
      const taskToUpdate = tasksArray.find((t: any) => t.id === individualTaskId);

      if (!taskToUpdate) {
        throw new Error('Task not found in data array');
      }

      const resourceIds = [...(taskToUpdate.resource_ids || [])];
      const resourceNames = [...(taskToUpdate.resource_names || [])];

      const genericIndex = resourceIds.findIndex((id: string) => id === selectedGenericResource.resource_id);

      if (genericIndex !== -1) {
        resourceIds[genericIndex] = selectedResource.id;
        resourceNames[genericIndex] = selectedResource.display_name;
      } else {
        const nameIndex = resourceNames.findIndex((name: string) =>
          name.toLowerCase().includes('generic') && name === selectedGenericResource.resource_name
        );
        if (nameIndex !== -1) {
          resourceIds[nameIndex] = selectedResource.id;
          resourceNames[nameIndex] = selectedResource.display_name;
        }
      }

      taskToUpdate.resource_ids = resourceIds;
      taskToUpdate.resource_names = resourceNames;

      const { error: updateError } = await supabase
        .from('project_tasks')
        .update({ task_data: fullTaskData })
        .eq('id', projectTaskId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('resource_fulfillment_history')
        .insert({
          task_id: projectTaskId,
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

      await fetchAllProjectsAndTasks();
    } catch (error) {
      console.error('Error assigning resource:', error);
      showNotification('Error assigning resource', 'error');
    }
  };

  const handleTaskClick = (task: TaskWithGenericResources) => {
    setSelectedTask(task);
    if (task.generic_resources.length > 0) {
      const allRoles = task.generic_resources.flatMap(gr => gr.roles || []);
      setRoleFilter([...new Set(allRoles)]);
    }
  };

  const clearRoleFilter = () => {
    setRoleFilter([]);
  };

  const generateDateColumns = () => {
    const columns = [];
    const currentDate = new Date(timelineStart);

    while (currentDate <= timelineEnd) {
      columns.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return columns;
  };

  // Collect all unique resources from tasks (both generic and named)
  const allResourceOptions = useMemo(() => {
    const resourceMap = new Map<string, { id: string; name: string; type: 'generic' | 'named' }>();

    projects.forEach(project => {
      project.tasks.forEach(task => {
        // Add generic resources
        task.generic_resources.forEach(gr => {
          resourceMap.set(`generic-${gr.resource_name}`, {
            id: `generic-${gr.resource_name}`,
            name: `${gr.resource_name} (Generic)`,
            type: 'generic'
          });
        });

        // Add named resources (from resource_names in task_data)
        const resourceNames = task.task_data.fullTaskData?.data
          ?.find((t: any) => t.id === task.task_data.individualTaskId)
          ?.resource_names || [];

        resourceNames.forEach((name: string) => {
          if (name) {
            resourceMap.set(`named-${name}`, {
              id: `named-${name}`,
              name: name,
              type: 'named'
            });
          }
        });
      });
    });

    return Array.from(resourceMap.values()).sort((a, b) => {
      // Sort generics first, then alphabetically
      if (a.type !== b.type) {
        return a.type === 'generic' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [projects]);

  // Filter projects based on selected resources
  const filteredProjects = useMemo(() => {
    if (selectedResourceIds.length === 0) {
      return projects;
    }

    return projects.map(project => {
      const filteredTasks = project.tasks.filter(task => {
        // Check if task has any of the selected resources
        const hasSelectedResource = selectedResourceIds.some(selectedId => {
          if (selectedId.startsWith('generic-')) {
            const resourceName = selectedId.replace('generic-', '');
            return task.generic_resources.some(gr => gr.resource_name === resourceName);
          } else if (selectedId.startsWith('named-')) {
            const resourceName = selectedId.replace('named-', '');
            const taskResourceNames = task.task_data.fullTaskData?.data
              ?.find((t: any) => t.id === task.task_data.individualTaskId)
              ?.resource_names || [];
            return taskResourceNames.includes(resourceName);
          }
          return false;
        });

        return hasSelectedResource;
      });

      if (filteredTasks.length === 0) return null;

      return {
        ...project,
        tasks: filteredTasks,
        pending_count: filteredTasks.filter(t => !t.is_fulfilled).length
      };
    }).filter(p => p !== null) as Project[];
  }, [projects, selectedResourceIds]);

  const dateColumns = generateDateColumns();
  const totalPendingCount = filteredProjects.reduce((sum, p) => sum + p.pending_count, 0);
  const totalFulfilledCount = filteredProjects.reduce((sum, p) => sum + p.tasks.filter(t => t.is_fulfilled).length, 0);
  const totalTaskCount = filteredProjects.reduce((sum, p) => sum + p.tasks.length, 0);

  // Collect all tasks from all projects for overallocation checking
  // Use the original projects list, not filtered, to check for all overlaps
  const allTasks = useMemo(() => {
    return projects.flatMap(p => p.tasks);
  }, [projects]);

  const handlePreviousPeriod = () => {
    const newStart = new Date(currentPeriodStart);
    newStart.setDate(newStart.getDate() - 14);
    setCurrentPeriodStart(newStart);
  };

  const handleNextPeriod = () => {
    const newStart = new Date(currentPeriodStart);
    newStart.setDate(newStart.getDate() + 14);
    setCurrentPeriodStart(newStart);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentPeriodStart(today);
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Fulfillment Calendar</h1>
            <p className="text-sm text-gray-600 mt-1">
              Click a task bar to filter resources, then drag a resource onto the task to assign
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Overallocated tasks use 40+ hours per week. Hover over tasks to see allocation details.
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{totalTaskCount}</span> total tasks
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 rounded mr-2"></div>
                <span className="text-gray-600">Normal (Pending)</span>
              </div>
              <div className="flex items-center">
                <div
                  className="w-4 h-4 bg-green-600 rounded mr-2"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                  }}
                ></div>
                <span className="text-gray-600">Normal (Fulfilled)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                <span className="text-gray-600">Overallocated (Pending)</span>
              </div>
              <div className="flex items-center">
                <div
                  className="w-4 h-4 bg-red-600 rounded mr-2"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)'
                  }}
                ></div>
                <span className="text-gray-600">Overallocated (Fulfilled)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePreviousPeriod}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous 2 Weeks
          </button>

          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {timelineStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' - '}
              {timelineEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button
              onClick={handleToday}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              Go to Today
            </button>
          </div>

          <button
            onClick={handleNextPeriod}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Next 2 Weeks
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>

        {/* Resource Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-700">
            <Filter className="w-4 h-4 mr-2" />
            <span className="font-medium">Filter by Resource:</span>
          </div>
          <div className="flex-1 max-w-md">
            <SearchableMultiSelect
              options={allResourceOptions.map(r => ({ value: r.id, label: r.name }))}
              selectedValues={selectedResourceIds}
              onChange={setSelectedResourceIds}
              placeholder="All resources"
            />
          </div>
          {selectedResourceIds.length > 0 && (
            <button
              onClick={() => setSelectedResourceIds([])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear Filter
            </button>
          )}
          <div className="text-sm text-gray-500">
            {selectedResourceIds.length > 0 && (
              <span>Showing {totalTaskCount} tasks for {selectedResourceIds.length} resource{selectedResourceIds.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {/* Main Calendar View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Timeline Header */}
            <div className="bg-gray-50 border-b border-gray-200 flex">
              <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 bg-white">
                <h3 className="text-sm font-semibold text-gray-900">Project / Task</h3>
              </div>
              <div className="flex-1 flex">
                {dateColumns.map((date, idx) => {
                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <div
                      key={idx}
                      className={`flex-1 px-2 py-2 border-r border-gray-200 text-center ${
                        isToday ? 'bg-blue-100' : isWeekend ? 'bg-gray-100' : 'bg-white'
                      }`}
                    >
                      <div className="text-xs font-semibold text-gray-900">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-xs text-gray-600">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900">No Tasks Found</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedResourceIds.length > 0
                        ? 'No tasks found for the selected resources in the current timeline'
                        : 'There are no tasks with resources in the current timeline'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <div key={project.id} className="border-b border-gray-200">
                    {/* Project Header Row */}
                    <div className="flex bg-gray-50">
                      <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-900 truncate" title={project.name}>
                            {project.name}
                          </h4>
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            {project.pending_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 h-5 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                                {project.pending_count}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {project.tasks.length} tasks
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-10"></div>
                      </div>
                    </div>

                    {/* Task Rows */}
                    {project.tasks.map((task, taskIdx) => {
                      // Get resource names from task_data for display
                      const resourceNames = task.task_data.fullTaskData?.data
                        ?.find((t: any) => t.id === task.task_data.individualTaskId)
                        ?.resource_names || [];

                      const displayResources = task.is_fulfilled
                        ? resourceNames.join(', ')
                        : task.generic_resources.map(gr => gr.resource_name).join(', ');

                      return (
                        <div key={task.id} className={`flex ${taskIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="w-64 flex-shrink-0 px-4 py-3 border-r border-gray-200">
                            <div className="flex items-start space-x-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate" title={task.task_name}>
                                  {task.task_name}
                                </p>
                                {displayResources && (
                                  <p className="text-xs text-gray-500 mt-1 truncate" title={displayResources}>
                                    {displayResources}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 relative" style={{ height: '50px' }}>
                            <DroppableTaskBar
                              task={task}
                              timelineStart={timelineStart}
                              timelineEnd={timelineEnd}
                              onTaskClick={handleTaskClick}
                              allTasks={allTasks}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar - Resources */}
          <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                Available Resources ({filteredResources.length})
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
                      <X className="w-4 h-4" />
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
              {selectedTask && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">Selected Task</p>
                  <p className="text-xs text-blue-800 truncate" title={selectedTask.task_name}>
                    {selectedTask.task_name}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      clearRoleFilter();
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear selection
                  </button>
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
        onClose={() => {
          setIsModalOpen(false);
          setSelectedResource(null);
          setSelectedGenericResource(null);
        }}
        resource={selectedResource}
        task={selectedTask}
        genericResource={selectedGenericResource}
        onConfirm={handleConfirmAssignment}
      />
    </div>
  );
}
