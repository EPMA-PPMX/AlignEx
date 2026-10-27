import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DEMO_USER_ID, DEMO_TENANT_NAME } from './useCurrentUser';

export interface RequestApprovalPermission {
  canApproveRequest: boolean;
  loading: boolean;
}

/**
 * Determines whether the current user can approve/reject project initiation requests.
 *
 * The check mirrors the project-permissions logic but is tenant-scoped rather than
 * project-scoped, because a request has not yet become a project. The user's system
 * role is matched against the project_roles table and the union of permissions across
 * all roles the user holds is checked for the `project.approve_request` key.
 *
 * Global admins and portfolio managers always have the permission.
 */
export function useRequestApprovalPermission(): RequestApprovalPermission {
  const [canApproveRequest, setCanApproveRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      setLoading(true);

      const { data: userRow } = await supabase
        .from('users')
        .select('system_role, resource_id, tenant_name')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (!userRow) {
        setCanApproveRequest(false);
        return;
      }

      const isGlobalAdmin =
        userRow.system_role === 'Admin' || userRow.system_role === 'Administrators';
      const isPortfolioManager =
        userRow.system_role === 'Portfolio Manager' ||
        userRow.system_role === 'Portfolio Managers';

      if (isGlobalAdmin || isPortfolioManager) {
        setCanApproveRequest(true);
        return;
      }

      const systemRole = userRow.system_role;
      const tenant = userRow.tenant_name || DEMO_TENANT_NAME;

      const { data: rolePerms } = await supabase
        .from('project_role_permissions')
        .select('permission_key, can_execute, tenant_name')
        .eq('role_name', systemRole)
        .eq('permission_key', 'project.approve_request')
        .eq('can_execute', true)
        .or(`tenant_name.is.null,tenant_name.eq.${tenant}`);

      const hasPermission = (rolePerms || []).some((p: any) => p.can_execute === true);
      setCanApproveRequest(hasPermission);
    } catch (err) {
      console.error('Error checking request approval permission:', err);
      setCanApproveRequest(false);
    } finally {
      setLoading(false);
    }
  };

  return { canApproveRequest, loading };
}
