import { X } from 'lucide-react';
import { DashboardWidget } from '../lib/useCurrentUser';

interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidget[];
  onToggleWidget: (widgetId: string, isEnabled: boolean) => void;
}

const widgetInfo: { [key: string]: { name: string; description: string } } = {
  personal_goals: { name: 'Personal Goals', description: 'Track your skill development goals and progress' },
  my_tasks: { name: 'My Tasks', description: 'View tasks assigned to you with deadlines and priorities' },
  my_projects: { name: 'My Projects', description: 'Monitor projects you manage or are assigned to' },
  pending_approvals: { name: 'Pending Approvals', description: 'Review change requests and approvals needing attention' },
  deadlines: { name: 'Deadlines', description: 'See upcoming deadlines from tasks and goals' },
  timesheet_quick: { name: 'Timesheet Quick Entry', description: 'Log hours and view weekly summary' },
  recent_activity: { name: 'Recent Activity', description: 'Stay updated on recent project changes' },
  project_health: { name: 'Project Health', description: 'Overview of project health across your portfolio' },
  team_capacity: { name: 'Team Capacity', description: 'Monitor team allocation and availability' }
};

export default function CustomizeWidgetsModal({ isOpen, onClose, widgets, onToggleWidget }: CustomizeWidgetsModalProps) {
  if (!isOpen) return null;

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
          <p className="text-sm text-gray-600 mb-4">
            Select which widgets you want to display on your dashboard
          </p>

          <div className="space-y-2">
            {widgets
              .sort((a, b) => a.position_order - b.position_order)
              .map((widget) => {
                const info = widgetInfo[widget.widget_type];
                if (!info) return null;

                return (
                  <div
                    key={widget.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={widget.is_enabled}
                      onChange={(e) => onToggleWidget(widget.id, e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{info.name}</h3>
                      <p className="text-xs text-gray-600 mt-0.5">{info.description}</p>
                    </div>
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
