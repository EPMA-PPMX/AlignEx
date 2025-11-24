import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Target, TrendingUp, FileText, Award, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Project Initiation',
      path: '/initiation',
      icon: FileText,
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: FolderKanban,
    },
    {
      name: 'Organizational Priorities',
      path: '/priorities',
      icon: TrendingUp,
    },
    {
      name: 'Resources',
      path: '/resources',
      icon: Users,
    },
    {
      name: 'Skills',
      path: '/skills',
      icon: Award,
    },
    {
      name: 'Timesheet',
      path: '/timesheet',
      icon: Clock,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-dark shadow-lg border-r border-primary-700/30 transition-all duration-300 flex flex-col`}>
      <div className="flex items-center justify-center py-8 px-4 border-b border-primary-700/30 relative">
        <img
          src={isCollapsed ? "/Just Logo - AlignEX.png" : "/Full Logo.png"}
          alt="AlignEx"
          className={`${isCollapsed ? 'h-16 w-16' : 'w-full h-auto'} transition-all duration-300`}
        />
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-primary-800 border border-primary-600 rounded-full p-1 hover:bg-primary-700 transition-colors shadow-sm"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      <nav className="mt-6 px-4 flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-primary text-white shadow-lg'
                      : 'text-purple-200 hover:bg-primary-800/50 hover:text-white'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-purple-300'} ${isCollapsed ? '' : 'flex-shrink-0'}`} />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;