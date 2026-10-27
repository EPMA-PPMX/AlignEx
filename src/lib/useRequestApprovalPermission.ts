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
 * The check is tenant-scoped rather than project-scoped, because a request has not
 * yet become a project. The user's system role is matched against the
 * project_role_permissions table for the `project.approve_request` key.
 *
 * A tenant-specific override always wins over the global default. If no
 * tenant-specific row exists, the global row is used. If neither exists,
 * the permission is denied.
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
        .select('system_role, tenant_name')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      if (!userRow || !userRow.system_role) {
        setCanApproveRequest(false);
        return;
      }

      const systemRole = userRow.system_role;
      const tenant = userRow.tenant_name || DEMO_TENANT_NAME;

      const { data: rolePerms } = await supabase
        .from('project_role_permissions')
        .select('can_execute, tenant_name')
        .eq('role_name', systemRole)
        .eq('permission_key', 'project.approve_request')
        .or(`tenant_name.is.null,tenant_name.eq.${tenant}`);

      const rows = rolePerms || [];

      // Prefer a tenant-specific override; fall back to the global default.
      const tenantRow = rows.find((r: any) => r.tenant_name === tenant);
      const globalRow = rows.find((r: any) => r.tenant_name === null);
      const effective = tenantRow ?? globalRow;

      setCanApproveRequest(effective ? effective.can_execute === true : false);
    } catch (err) {
      console.error('Error checking request approval permission:', err);
      setCanApproveRequest(false);
    } finally {
      setLoading(false);
    }
  };

  return { canApproveRequest, loading };
}
