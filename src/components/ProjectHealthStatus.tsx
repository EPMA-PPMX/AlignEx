import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProjectHealthStatusProps {
  currentStatus: string;
  projectId: string;
  onStatusUpdate: (newStatus: string) => void;
}

const healthStatusOptions = [
  { value: 'On Track', label: 'On Track', color: 'bg-green-100 text-green-800' },
  { value: 'At Risk', label: 'At Risk', color: 'bg-red-100 text-red-800' },
  { value: 'Delayed', label: 'Delayed', color: 'bg-orange-100 text-orange-800' },
  { value: 'Completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
];

const ProjectHealthStatus: React.FC<ProjectHealthStatusProps> = ({
  currentStatus,
  projectId,
  onStatusUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStatusOption = healthStatusOptions.find(s => s.value === currentStatus) || healthStatusOptions[0];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ health_status: newStatus })
        .eq('id', projectId);

      if (error) {
        alert(`Error updating status: ${error.message}`);
      } else {
        onStatusUpdate(newStatus);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatusOption.color} hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-wait disabled:opacity-50`}
      >
        {isUpdating ? 'Updating...' : currentStatusOption.label}
        <svg
          className="ml-2 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            {healthStatusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  option.value === currentStatus ? 'bg-gray-100' : ''
                }`}
              >
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectHealthStatus;
