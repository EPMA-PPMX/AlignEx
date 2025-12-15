import React from 'react';
import { useModuleAccess } from '../lib/useModuleAccess';
import { ModuleKey } from '../lib/permissionService';
import { Lock, Zap } from 'lucide-react';

interface RequiresModuleProps {
  children: React.ReactNode;
  moduleKey: ModuleKey;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  userEmail?: string;
}

export default function RequiresModule({
  children,
  moduleKey,
  fallback,
  showUpgradePrompt = true,
  userEmail,
}: RequiresModuleProps) {
  const { isAvailable, loading } = useModuleAccess(moduleKey, userEmail);

  if (loading) {
    return null; // Or a loading skeleton
  }

  if (!isAvailable) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradePrompt) {
      const moduleNames: Record<ModuleKey, string> = {
        base: 'Base Platform',
        skills: 'Skills Management',
        benefits: 'Benefit Realization',
      };

      return (
        <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-md text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {moduleNames[moduleKey]} Module Not Available
            </h3>
            <p className="text-gray-600 mb-6">
              This feature requires the {moduleNames[moduleKey]} add-on module. Contact your
              administrator to activate this module for your organization.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => {
                // Navigate to license management or contact admin
                window.location.href = '/settings';
              }}
            >
              <Zap className="w-4 h-4" />
              Activate Module
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
