import React, { useState } from 'react';
import { Award, Settings2, Users } from 'lucide-react';
import SkillCategoriesManagement from './SkillCategoriesManagement';
import SkillsManagement from './SkillsManagement';
import RoleManagement from './RoleManagement';

const SkillsSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('categories');

  const tabs = [
    { id: 'categories', name: 'Skill Categories', icon: Award },
    { id: 'skills', name: 'Skills', icon: Settings2 },
    { id: 'roles', name: 'Roles', icon: Users },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Skills Settings</h2>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'categories' && <SkillCategoriesManagement />}
        {activeTab === 'skills' && <SkillsManagement />}
        {activeTab === 'roles' && <RoleManagement />}
      </div>
    </div>
  );
};

export default SkillsSettings;
