import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Settings, Target, TrendingUp, FileText, Award, Users, CheckSquare, Clock, ChevronLeft, ChevronRight, BarChart3, Lock, ClipboardCheck, Calendar } from 'lucide-react';
import { LayoutDashboard, FolderKanban, Settings, Target, TrendingUp, FileText, Award, Users, CheckSquare, Clock, ChevronLeft, ChevronRight, BarChart3, Lock, ClipboardCheck, UserCog } from 'lucide-react';
import { usePermissions } from '../lib/usePermissions';
import { ModuleKey } from '../lib/permissionService';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  requiredModule?: ModuleKey;
  requiresManagePermission?: boolean;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { availableModules, can, loading } = usePermissions();

  const allNavItems: NavItem[] = [
    {
      name: 'My Hub',
      path: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Project Request',
      path: '/initiation',
      icon: FileText,
    },
    {
      name: 'Project Center',
      path: '/projects',
      icon: FolderKanban,
    },
    {
      name: 'Strategic Priorities',
      path: '/priorities',
      icon: TrendingUp,
      requiresManagePermission: true,
    },
    {
      name: 'Resources',
      path: '/resources',
      icon: Users,
    },
    {
      name: 'Resource Fulfillment',
      path: '/resource-fulfillment',
      icon: UserCog,
    },
    {
      name: 'My Skills',
      path: '/skills',
      icon: Award,
      requiredModule: 'skills',
    },
    {
      name: 'Timesheet',
      path: '/timesheet',
      icon: Clock,
    },
    {
      name: 'Timesheet Approvals',
      path: '/timesheet-approval',
      icon: ClipboardCheck,
    },
    {
      name: 'Status Report',
      path: '/status-report',
      icon: BarChart3,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      requiresManagePermission: true,
    },
  ];

  const navItems = useMemo(() => {
    if (loading) return allNavItems; // Show all while loading

    return allNavItems.filter((item) => {
      // Check if module is required and available
      if (item.requiredModule && !availableModules.includes(item.requiredModule)) {
        return false;
      }

      // Check if management permission is required
      if (item.requiresManagePermission && !can.manage) {
        return false;
      }

      return true;
    });
  }, [availableModules, can.manage, loading]);

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-dark shadow-lg border-r border-primary-700/30 transition-all duration-300 flex flex-col`}>
      <div className="flex items-center justify-center py-8 px-4 border-b border-primary-700/30 relative">
        <img
          src={isCollapsed ? "/PPMX.gif" : "/PPMX.gif"}
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