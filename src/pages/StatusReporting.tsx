import React from 'react';
import { FileText } from 'lucide-react';

const StatusReporting: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Status Reporting</h1>
            <p className="text-gray-600 mt-1">Generate and view project status reports</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600">Status reporting functionality coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default StatusReporting;
