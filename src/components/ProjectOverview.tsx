import React from 'react';
import { BarChart3, TrendingUp, Calendar, Target } from 'lucide-react';

const ProjectOverview: React.FC = () => {
  const chartData = [
    { month: 'Jan', completed: 12, inProgress: 8 },
    { month: 'Feb', completed: 15, inProgress: 10 },
    { month: 'Mar', completed: 18, inProgress: 12 },
    { month: 'Apr', completed: 22, inProgress: 9 },
    { month: 'May', completed: 25, inProgress: 11 },
    { month: 'Jun', completed: 28, inProgress: 13 },
  ];

  const upcomingDeadlines = [
    { project: 'Website Redesign', deadline: '2024-02-15', priority: 'high' },
    { project: 'Security Audit', deadline: '2024-02-20', priority: 'high' },
    { project: 'Marketing Campaign', deadline: '2024-02-28', priority: 'medium' },
    { project: 'Mobile App Development', deadline: '2024-03-15', priority: 'medium' },
  ];

  return (
    <div className="space-y-6">
      {/* Project Progress Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Progress</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
              <span className="text-gray-600">In Progress</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-end space-x-2 h-64">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col items-center space-y-1">
                <div className="w-full bg-gray-100 rounded-t-sm" style={{ height: `${(data.inProgress / 30) * 200}px`, minHeight: '4px' }}>
                  <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: '100%' }}></div>
                </div>
                <div className="w-full bg-gray-100" style={{ height: `${(data.completed / 30) * 200}px`, minHeight: '4px' }}>
                  <div className="w-full bg-blue-500" style={{ height: '100%' }}></div>
                </div>
              </div>
              <span className="text-xs text-gray-600 mt-2">{data.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Deadlines</h3>
        <div className="space-y-3">
          {upcomingDeadlines.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  item.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="font-medium text-gray-900">{item.project}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;