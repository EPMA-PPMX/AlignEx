import { useState, useEffect } from 'react';
import { permissionService, ModuleKey } from './permissionService';

interface UseModuleAccessResult {
  isAvailable: boolean;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  loading: boolean;
  error: string | null;
}

const DEFAULT_USER_EMAIL = 'demo@alignex.com'; // Replace with actual user email from auth

export function useModuleAccess(moduleKey: ModuleKey, userEmail?: string): UseModuleAccessResult {
  const email = userEmail || DEFAULT_USER_EMAIL;

  const [isAvailable, setIsAvailable] = useState(false);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModuleAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get organization ID first
        const orgId = await permissionService.getOrganizationId(email);

        // Check if module is available for organization
        const hasModule = await permissionService.hasModuleAccess(orgId, moduleKey);
        setIsAvailable(hasModule);

        if (!hasModule) {
          // If module not available, user can't do anything
          setCanView(false);
          setCanEdit(false);
          setCanManage(false);
          return;
        }

        // Module is available, now check user permissions
        const [view, edit, manage] = await Promise.all([
          permissionService.canPerformAction(email, 'view'),
          permissionService.canPerformAction(email, 'edit'),
          permissionService.canPerformAction(email, 'manage'),
        ]);

        setCanView(view);
        setCanEdit(edit);
        setCanManage(manage);
      } catch (err: any) {
        console.error('Error loading module access:', err);
        setError(err.message || 'Failed to load module access');

        // Default to allowing access on error for backward compatibility
        setIsAvailable(true);
        setCanView(true);
        setCanEdit(true);
        setCanManage(true);
      } finally {
        setLoading(false);
      }
    };

    loadModuleAccess();
  }, [moduleKey, email]);

  return {
    isAvailable,
    canView,
    canEdit,
    canManage,
    loading,
    error,
  };
}
