import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { useCurrentUser } from '../lib/useCurrentUser';
import PersonalGoalsWidget from '../components/widgets/PersonalGoalsWidget';
import MyTasksWidget from '../components/widgets/MyTasksWidget';
import MyProjectsWidget from '../components/widgets/MyProjectsWidget';
import MyRisksWidget from '../components/widgets/MyRisksWidget';
import MyIssuesWidget from '../components/widgets/MyIssuesWidget';
import DeadlinesWidget from '../components/widgets/DeadlinesWidget';
import TimesheetQuickWidget from '../components/widgets/TimesheetQuickWidget';
import RecentActivityWidget from '../components/widgets/RecentActivityWidget';
import CustomizeWidgetsModal from '../components/CustomizeWidgetsModal';

const Dashboard: React.FC = () => {
  const { user, widgets, loading, toggleWidget, reorderWidgets, changeWidgetSize, refetch } = useCurrentUser();
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const handleToggleWidget = async (widgetId: string, isEnabled: boolean) => {
    await toggleWidget(widgetId, isEnabled);
    refetch();
  };

  const handleReorderWidgets = async (reorderedWidgets: any[]) => {
    await reorderWidgets(reorderedWidgets);
  };

  const handleChangeWidgetSize = async (widgetId: string, size: 'small' | 'medium' | 'large') => {
    await changeWidgetSize(widgetId, size);
    refetch();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const widgetComponents: { [key: string]: React.ReactNode } = {
    personal_goals: <PersonalGoalsWidget key="personal_goals" />,
    my_tasks: <MyTasksWidget key="my_tasks" />,
    my_projects: <MyProjectsWidget key="my_projects" />,
    my_risks: <MyRisksWidget key="my_risks" />,
    my_issues: <MyIssuesWidget key="my_issues" />,
    deadlines: <DeadlinesWidget key="deadlines" />,
    timesheet_quick: <TimesheetQuickWidget key="timesheet_quick" />,
    recent_activity: <RecentActivityWidget key="recent_activity" />,
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {getCurrentTime()}, {user?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {user?.system_role}
            </span>
            <span className="text-gray-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCustomizeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all border border-gray-300 shadow-sm"
          title="Customize Dashboard"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden md:inline">Customize</span>
        </button>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
        {widgets
          .filter(w => w.is_enabled)
          .sort((a, b) => a.position_order - b.position_order)
          .map((widget) => {
            const component = widgetComponents[widget.widget_type];
            if (!component) return null;

            const sizeClass = {
              small: 'lg:col-span-1',
              medium: 'lg:col-span-1',
              large: 'lg:col-span-2'
            }[widget.size];

            return (
              <div key={widget.id} className={`${sizeClass} min-h-[280px]`}>
                {component}
              </div>
            );
          })}
      </div>

      {widgets.filter(w => w.is_enabled).length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200 shadow-sm">
          <p className="text-gray-600 mb-4">No widgets enabled</p>
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Widgets
          </button>
        </div>
      )}

      <CustomizeWidgetsModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        widgets={widgets}
        onToggleWidget={handleToggleWidget}
        onReorderWidgets={handleReorderWidgets}
        onChangeWidgetSize={handleChangeWidgetSize}
      />
    </div>
  );
};

export default Dashboard;