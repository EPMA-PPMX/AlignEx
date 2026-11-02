import { supabase } from './supabase';

/**
 * Returns the permission keys granted to any of the given project roles.
 * Tenant-specific rows override global defaults per role, including explicit denials.
 */
export async function resolveGrantedPermissionKeys(
  roleNames: (string | null | undefined)[],
  tenantName: string | null | undefined,
): Promise<string[]> {
  const roles = Array.from(new Set(roleNames.filter((r): r is string => !!r)));
  if (roles.length === 0) return [];

  const { data, error } = await supabase
    .from('project_role_permissions')
    .select('role_name, permission_key, can_execute, tenant_name')
    .in('role_name', roles)
    .or(`tenant_name.is.null,tenant_name.eq.${tenantName ?? ''}`);
  if (error) throw error;

  const granted = new Set<string>();
  for (const role of roles) {
    const byKey = new Map<string, { can_execute: boolean; isTenant: boolean }>();
    for (const row of data || []) {
      if (row.role_name !== role) continue;
      const isTenant = row.tenant_name !== null;
      const existing = byKey.get(row.permission_key);
      if (!existing || (isTenant && !existing.isTenant)) {
        byKey.set(row.permission_key, { can_execute: row.can_execute, isTenant });
      }
    }
    for (const [key, value] of byKey) {
      if (value.can_execute) granted.add(key);
    }
  }
  return Array.from(granted);
}

export const VIEW_ALL_PROJECTS_PERMISSION = 'project.view_all';
