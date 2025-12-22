import { useState, useEffect } from 'react';
import { permissionService, LicenseTier, ModuleKey } from './permissionService';

interface PermissionActions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  manage: boolean;
  enterTimesheet: boolean;
  approveTimesheet: boolean;
  createProject: boolean;
  manageProject: boolean;
  createRequest: boolean;
  manageResources: boolean;
  manageOwnSkills: boolean;
  manageAllSkills: boolean;
  trackBenefits: boolean;
  export: boolean;
}

interface UsePermissionsResult {
  licenseTier: LicenseTier | null;
  availableModules: ModuleKey[];
  organizationId: string | null;
  can: PermissionActions;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_USER_EMAIL = 'demo@alignex.com'; // Replace with actual user email from auth

export function usePermissions(userEmail?: string): UsePermissionsResult {
  const email = userEmail || DEFAULT_USER_EMAIL;

  const [licenseTier, setLicenseTier] = useState<LicenseTier | null>(null);
  const [availableModules, setAvailableModules] = useState<ModuleKey[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [can, setCan] = useState<PermissionActions>({
    view: false,
    create: false,
    edit: false,
    delete: false,
    manage: false,
    enterTimesheet: false,
    approveTimesheet: false,
    createProject: false,
    manageProject: false,
    createRequest: false,
    manageResources: false,
    manageOwnSkills: false,
    manageAllSkills: false,
    trackBenefits: false,
    export: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tier, orgId] = await Promise.all([
        permissionService.getUserLicenseTier(email),
        permissionService.getOrganizationId(email),
      ]);

      setLicenseTier(tier);
      setOrganizationId(orgId);

      const modules = await permissionService.getAvailableModules(orgId);
      setAvailableModules(modules);

      const [
        canView,
        canCreate,
        canEdit,
        canDelete,
        canManage,
        canEnterTimesheet,
        canApproveTimesheet,
        canCreateProject,
        canManageProject,
        canCreateRequest,
        canManageResources,
        canManageOwnSkills,
        canManageAllSkills,
        canTrackBenefits,
        canExport,
      ] = await Promise.all([
        permissionService.canPerformAction(email, 'view'),
        permissionService.canPerformAction(email, 'create'),
        permissionService.canPerformAction(email, 'edit'),
        permissionService.canPerformAction(email, 'delete'),
        permissionService.canPerformAction(email, 'manage'),
        permissionService.canPerformAction(email, 'timesheet.enter'),
        permissionService.canPerformAction(email, 'timesheet.approve'),
        permissionService.canPerformAction(email, 'project.create'),
        permissionService.canPerformAction(email, 'project.manage'),
        permissionService.canPerformAction(email, 'request.create'),
        permissionService.canPerformAction(email, 'resource.manage'),
        permissionService.canPerformAction(email, 'skills.manage_own'),
        permissionService.canPerformAction(email, 'skills.manage_all'),
        permissionService.canPerformAction(email, 'benefits.track'),
        permissionService.canPerformAction(email, 'export'),
      ]);

      setCan({
        view: canView,
        create: canCreate,
        edit: canEdit,
        delete: canDelete,
        manage: canManage,
        enterTimesheet: canEnterTimesheet,
        approveTimesheet: canApproveTimesheet,
        createProject: canCreateProject,
        manageProject: canManageProject,
        createRequest: canCreateRequest,
        manageResources: canManageResources,
        manageOwnSkills: canManageOwnSkills,
        manageAllSkills: canManageAllSkills,
        trackBenefits: canTrackBenefits,
        export: canExport,
      });
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message || 'Failed to load permissions');

      // Default to full permissions on error for backward compatibility
      setLicenseTier('full_license');
      setAvailableModules(['base', 'skills', 'benefits']);
      setCan({
        view: true,
        create: true,
        edit: true,
        delete: true,
        manage: true,
        enterTimesheet: true,
        approveTimesheet: true,
        createProject: true,
        manageProject: true,
        createRequest: true,
        manageResources: true,
        manageOwnSkills: true,
        manageAllSkills: true,
        trackBenefits: true,
        export: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    licenseTier,
    availableModules,
    organizationId,
    can,
    loading,
    error,
    refresh: loadPermissions,
  };
}
