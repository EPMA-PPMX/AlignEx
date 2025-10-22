import React, { useState } from 'react';
import { Target, TrendingUp, BarChart3 } from 'lucide-react';
import StrategicPriorities from '../components/priorities/StrategicPriorities';
import ContributingProjects from '../components/priorities/ContributingProjects';
import PriorityAnalytics from '../components/priorities/PriorityAnalytics';

type TabType = 'strategic' | 'projects' | 'analytics';

export default function OrganizationalPriorities() {
  const [activeTab, setActiveTab] = useState<TabType>('strategic');

  const tabs = [
    { id: 'strategic' as TabType, label: 'Strategic Priorities', icon: Target },
    { id: 'projects' as TabType, label: 'Contributing Projects', icon: TrendingUp },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Organizational Priorities</h1>
        <p className="text-slate-600 mt-2">
          Manage strategic priorities and track project contributions toward organizational goals
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {activeTab === 'strategic' && <StrategicPriorities />}
        {activeTab === 'projects' && <ContributingProjects />}
        {activeTab === 'analytics' && <PriorityAnalytics />}
      </div>
    </div>
  );
}
