import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProjectStatusDropdownProps {
  currentState: string;
  projectId: string;
  onStateUpdate: (newState: string) => void;
}

const stateOptions = [
  { value: 'Active', label: 'Active', color: 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white border-[#5DB6B8]' },
  { value: 'On Hold', label: 'On Hold', color: 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white border-[#F89D43]' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white border-[#FD5D5D]' },
  { value: 'Closed', label: 'Closed', color: 'bg-gradient-to-br from-[#4D5656] to-[#95A5A6] text-white border-[#95A5A6]' },
];

const ProjectStatusDropdown: React.FC<ProjectStatusDropdownProps> = ({
  currentState,
  projectId,
  onStateUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentStateOption = stateOptions.find(s => s.value === currentState) || stateOptions[0];

  const handleStateChange = async (newState: string) => {
    if (newState === currentState) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ state: newState })
        .eq('id', projectId);

      if (error) {
        alert(`Error updating state: ${error.message}`);
      } else {
        onStateUpdate(newState);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error updating project state:', error);
      alert('Error updating state. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${currentStateOption.color} hover:opacity-80 transition-opacity cursor-pointer disabled:cursor-wait disabled:opacity-50`}
      >
        {isUpdating ? 'Updating...' : currentStateOption.label}
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
            {stateOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStateChange(option.value)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  option.value === currentState ? 'bg-gray-100' : ''
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

export default ProjectStatusDropdown;
