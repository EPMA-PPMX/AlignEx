import { useState, useEffect } from 'react';
import { X, GripVertical, LayoutDashboard } from 'lucide-react';
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
  my_change_requests: { name: 'My Change Requests', description: 'View all change requests you have created' },
  pending_approvals: { name: 'Pending Approvals', description: 'Review change requests and approvals needing attention' },
  deadlines: { name: 'Deadlines', description: 'See upcoming deadlines from tasks and goals' },
  timesheet_quick: { name: 'Timesheet Quick Entry', description: 'Log hours and view weekly summary' },
  recent_activity: { name: 'Recent Activity', description: 'Stay updated on recent project changes' },
  project_health: { name: 'Project Health', description: 'Overview of project health across your portfolio' },
  team_capacity: { name: 'My Team Workload', description: 'View 4-week workload heatmap for resources working on your projects' }
};

export default function CustomizeWidgetsModal({ isOpen, onClose, widgets, onToggleWidget, onReorderWidgets, onChangeWidgetSize }: CustomizeWidgetsModalProps) {
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalWidgets([...widgets].sort((a, b) => a.position_order - b.position_order));
    }
  }, [isOpen, widgets]);

  if (!isOpen) return null;

  const handleDragStart = (index: number) => setDraggedIndex(index);

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

  const enabledCount = localWidgets.filter(w => w.is_enabled).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1A3C5E] rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Customize Dashboard</h2>
              <p className="text-xs text-gray-500">{enabledCount} of {localWidgets.length} widgets enabled</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-500">
            Toggle widgets on/off and drag to reorder them on your dashboard.
          </p>
        </div>

        {/* Widget List */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {localWidgets.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">No widgets available</div>
          ) : (
            <div className="space-y-2">
              {localWidgets.map((widget, index) => {
                const info = widgetInfo[widget.widget_type];
                if (!info) return null;

                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-all cursor-move select-none ${
                      draggedIndex === index
                        ? 'opacity-40 bg-blue-50 border-blue-300 scale-95'
                        : widget.is_enabled
                        ? 'bg-white border-gray-200 hover:border-[#1A3C5E] hover:shadow-sm'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />

                    <input
                      type="checkbox"
                      checked={widget.is_enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleWidget(widget.id, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-[#1A3C5E] focus:ring-[#1A3C5E] flex-shrink-0 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${widget.is_enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                        {info.name}
                      </p>
                      <p className={`text-xs mt-0.5 ${widget.is_enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                        {info.description}
                      </p>
                      {onChangeWidgetSize && widget.is_enabled && (
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs text-gray-400 mr-1">Size:</span>
                          {(['small', 'medium', 'large'] as const).map((size) => (
                            <button
                              key={size}
                              onClick={(e) => {
                                e.stopPropagation();
                                onChangeWidgetSize(widget.id, size);
                              }}
                              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                widget.size === size
                                  ? 'bg-[#1A3C5E] text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {size.charAt(0).toUpperCase() + size.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      widget.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {widget.is_enabled ? 'On' : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-[#1A3C5E] hover:bg-[#15324f] rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
