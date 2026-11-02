import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DEMO_USER_ID, DEMO_TENANT_NAME } from './useCurrentUser';
import { fetchUserSystemRoles, resolveGrantedPermissionKeys } from './rolePermissions';

export interface ProjectRequestPermission {
  allowed: boolean;
  loading: boolean;
}

/**
 * Checks a project-level permission for the current user's system role.
 *
 * Tenant-specific overrides win over global defaults. If neither exists,
 * the permission is denied.
 */
function useProjectRolePermission(permissionKey: string): ProjectRequestPermission {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data: userRow } = await supabase
          .from('users')
          .select('system_role, tenant_name')
          .eq('id', DEMO_USER_ID)
          .maybeSingle();

        if (!userRow || !userRow.system_role) {
          if (!cancelled) setAllowed(false);
          return;
        }

        const roles = await fetchUserSystemRoles(DEMO_USER_ID, userRow.system_role);
        const granted = await resolveGrantedPermissionKeys(roles, userRow.tenant_name || DEMO_TENANT_NAME);
        if (!cancelled) setAllowed(granted.includes(permissionKey));
      } catch (err) {
        console.error(`Error checking permission ${permissionKey}:`, err);
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [permissionKey]);

  return { allowed, loading };
}

export function useRequestApprovalPermission() {
  const { allowed, loading } = useProjectRolePermission('project.approve_request');
  return { canApproveRequest: allowed, loading };
}

export function useCreateRequestPermission() {
  const { allowed, loading } = useProjectRolePermission('project.create_request');
  return { canCreateRequest: allowed, loading };
}

export function useTimesheetApprovePermission() {
  const { allowed, loading } = useProjectRolePermission('timesheet.approve');
  return { canApproveTimesheet: allowed, loading };
}
