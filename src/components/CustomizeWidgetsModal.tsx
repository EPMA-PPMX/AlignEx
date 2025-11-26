import { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import { DashboardWidget } from '../lib/useCurrentUser';

interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidget[];
  onToggleWidget: (widgetId: string, isEnabled: boolean) => void;
  onReorderWidgets: (reorderedWidgets: DashboardWidget[]) => void;
  onChangeWidgetSize?: (widgetId: string, size: 'small' | 'medium' | 'large') => void;
}

const widgetInfo: { [key: string]: { name: string; description: string } } = {
  personal_goals: { name: 'Personal Goals', description: 'Track your skill development goals and progress' },
  my_tasks: { name: 'My Tasks', description: 'View tasks assigned to you with deadlines and priorities' },
  my_projects: { name: 'My Projects', description: 'Monitor projects you manage with health status overview' },
  my_risks: { name: 'My Risks', description: 'Track risks from your projects and assigned risks' },
  my_issues: { name: 'My Issues', description: 'Monitor issues from your projects and assigned issues' },
  pending_approvals: { name: 'Pending Approvals', description: 'Review change requests and approvals needing attention' },
  deadlines: { name: 'Deadlines', description: 'See upcoming deadlines from tasks and goals' },
  timesheet_quick: { name: 'Timesheet Quick Entry', description: 'Log hours and view weekly summary' },
  recent_activity: { name: 'Recent Activity', description: 'Stay updated on recent project changes' },
  project_health: { name: 'Project Health', description: 'Overview of project health across your portfolio' },
  team_capacity: { name: 'My Team Capacity', description: 'Monitor allocation of resources working on your projects, sorted by overallocation' }
};

export default function CustomizeWidgetsModal({ isOpen, onClose, widgets, onToggleWidget, onReorderWidgets, onChangeWidgetSize }: CustomizeWidgetsModalProps) {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && widgets.length > 0) {
      setLocalWidgets([...widgets].sort((a, b) => a.position_order - b.position_order));
    }
  }, [isOpen, widgets]);

  if (!isOpen) return null;

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newWidgets = [...localWidgets];
    const draggedWidget = newWidgets[draggedIndex];
    newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(index, 0, draggedWidget);

    setLocalWidgets(newWidgets);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    const reorderedWidgets = localWidgets.map((widget, index) => ({
      ...widget,
      position_order: index + 1
    }));
    onReorderWidgets(reorderedWidgets);
  };

  const sortedWidgets = localWidgets.length > 0 ? localWidgets : [...widgets].sort((a, b) => a.position_order - b.position_order);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Customize Dashboard</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          <p className="text-sm text-gray-600 mb-2">
            Drag widgets to reorder them on your dashboard
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Check or uncheck to show/hide widgets
          </p>

          <div className="space-y-2">
            {sortedWidgets.map((widget, index) => {
              const info = widgetInfo[widget.widget_type];
              if (!info) return null;

              return (
                <div
                  key={widget.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-3 p-3 border border-gray-200 rounded-lg transition-all cursor-move ${
                    draggedIndex === index
                      ? 'opacity-50 bg-blue-50 border-blue-400'
                      : 'hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <GripVertical className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <input
                    type="checkbox"
                    checked={widget.is_enabled}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleWidget(widget.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{info.name}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">{info.description}</p>
                    {onChangeWidgetSize && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-gray-500 mr-1">Size:</span>
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={(e) => {
                              e.stopPropagation();
                              onChangeWidgetSize(widget.id, size);
                            }}
                            className={`px-2 py-0.5 text-xs rounded transition-colors ${
                              widget.size === size
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">#{widget.position_order}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
