import React from 'react';
import { usePermissions } from '../lib/usePermissions';
import { Lock } from 'lucide-react';

interface ProtectedFeatureProps {
  children: React.ReactNode;
  requiredAction: 'view' | 'create' | 'edit' | 'delete' | 'manage';
  fallback?: React.ReactNode;
  showLockIcon?: boolean;
  userEmail?: string;
}

export default function ProtectedFeature({
  children,
  requiredAction,
  fallback,
  showLockIcon = false,
  userEmail,
}: ProtectedFeatureProps) {
  const { can, loading } = usePermissions(userEmail);

  if (loading) {
    return null; // Or a loading skeleton
  }

  const hasPermission = can[requiredAction];

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showLockIcon) {
      return (
        <div className="inline-flex items-center gap-2 text-gray-400" title="Insufficient permissions">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Restricted</span>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
