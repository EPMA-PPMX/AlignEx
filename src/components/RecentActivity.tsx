import React from 'react';
import { Clock, User, FileText, CheckCircle, MessageSquare } from 'lucide-react';

const RecentActivity: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: 'project_update',
      user: 'John Doe',
      action: 'updated progress on',
      target: 'Website Redesign',
      time: '2 hours ago',
      icon: FileText,
    },
    {
      id: 2,
      type: 'completion',
      user: 'Sarah Wilson',
      action: 'completed',
      target: 'Database Migration',
      time: '4 hours ago',
      icon: CheckCircle,
    },
    {
      id: 3,
      type: 'comment',
      user: 'Mike Johnson',
      action: 'commented on',
      target: 'Mobile App Development',
      time: '6 hours ago',
      icon: MessageSquare,
    },
    {
      id: 4,
      type: 'assignment',
      user: 'Emily Davis',
      action: 'was assigned to',
      target: 'Security Audit',
      time: '1 day ago',
      icon: User,
    },
    {
      id: 5,
      type: 'project_update',
      user: 'David Brown',
      action: 'updated deadline for',
      target: 'Training Program',
      time: '2 days ago',
      icon: Clock,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;
          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span>
                  {' '}{activity.action}{' '}
                  <span className="font-medium text-primary-600">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all activity
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;