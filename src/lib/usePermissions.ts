import { useState, useEffect } from 'react';
import { permissionService, LicenseTier, ModuleKey } from './permissionService';
import { supabase } from './supabase';
import { DEMO_USER_ID } from './useCurrentUser';

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
  isSuperUser: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePermissions(userEmail?: string): UsePermissionsResult {
  const [email, setEmail] = useState<string>(userEmail || '');

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
  const [isSuperUser, setIsSuperUser] = useState(false);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      let activeEmail = userEmail || email;
      if (!activeEmail) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', DEMO_USER_ID)
          .maybeSingle();
        activeEmail = userData?.email || 'mandar.pednekar@tcs.com';
        setEmail(activeEmail);
      }

      const [tier, orgId] = await Promise.all([
        permissionService.getUserLicenseTier(activeEmail),
        permissionService.getOrganizationId(activeEmail),
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
        permissionService.canPerformAction(activeEmail, 'view'),
        permissionService.canPerformAction(activeEmail, 'create'),
        permissionService.canPerformAction(activeEmail, 'edit'),
        permissionService.canPerformAction(activeEmail, 'delete'),
        permissionService.canPerformAction(activeEmail, 'manage'),
        permissionService.canPerformAction(activeEmail, 'timesheet.enter'),
        permissionService.canPerformAction(activeEmail, 'timesheet.approve'),
        permissionService.canPerformAction(activeEmail, 'project.create'),
        permissionService.canPerformAction(activeEmail, 'project.manage'),
        permissionService.canPerformAction(activeEmail, 'request.create'),
        permissionService.canPerformAction(activeEmail, 'resource.manage'),
        permissionService.canPerformAction(activeEmail, 'skills.manage_own'),
        permissionService.canPerformAction(activeEmail, 'skills.manage_all'),
        permissionService.canPerformAction(activeEmail, 'benefits.track'),
        permissionService.canPerformAction(activeEmail, 'export'),
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

      setIsSuperUser(tier === 'Super User license');
    } catch (err: any) {
      console.error('Error loading permissions:', err);
      setError(err.message || 'Failed to load permissions');

      // Default to full permissions on error for backward compatibility
      setLicenseTier('Full license');
      setAvailableModules(['base', 'skills', 'benefits']);
      setIsSuperUser(false);
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
    isSuperUser,
    loading,
    error,
    refresh: loadPermissions,
  };
}
