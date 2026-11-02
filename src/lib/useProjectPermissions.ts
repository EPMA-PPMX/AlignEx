import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DEMO_USER_ID } from './useCurrentUser';
import { fetchUserSystemRoles, resolveGrantedPermissionKeys, VIEW_ALL_PROJECTS_PERMISSION } from './rolePermissions';

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

export interface ProjectPermissions {
  projectId: string;
  permissions: string[];
  canView: boolean;
  canEditDetails: boolean;
  canEditSchedule: boolean;
  canEditBudget: boolean;
  canViewBudget: boolean;
  canManageTeam: boolean;
  canApproveChanges: boolean;
  canCreateRisks: boolean;
  canEditRisks: boolean;
  canCreateIssues: boolean;
  canEditIssues: boolean;
  canUploadDocuments: boolean;
  canDelete: boolean;
  canCreateStatusReport: boolean;
  canViewStatusReports: boolean;
}

const EMPTY_PERMISSIONS: ProjectPermissions = {
  projectId: '',
  permissions: [],
  canView: false,
  canEditDetails: false,
  canEditSchedule: false,
  canEditBudget: false,
  canViewBudget: false,
  canManageTeam: false,
  canApproveChanges: false,
  canCreateRisks: false,
  canEditRisks: false,
  canCreateIssues: false,
  canEditIssues: false,
  canUploadDocuments: false,
  canDelete: false,
  canCreateStatusReport: false,
  canViewStatusReports: false,
};

const ALL_PROJECT_PERMISSION_KEYS = [
  'project.view', 'project.edit_details', 'project.edit_schedule',
  'project.edit_budget', 'project.view_budget', 'project.manage_team',
  'project.approve_changes', 'project.create_risks', 'project.edit_risks',
  'project.create_issues', 'project.edit_issues', 'project.upload_documents',
  'project.delete', 'project.create_status_report', 'project.view_status_reports',
];

function buildPermissions(projectId: string, permKeys: string[]): ProjectPermissions {
  const has = (k: string) => permKeys.includes(k);
  return {
    projectId,
    permissions: permKeys,
    canView: has('project.view'),
    canEditDetails: has('project.edit_details'),
    canEditSchedule: has('project.edit_schedule'),
    canEditBudget: has('project.edit_budget'),
    canViewBudget: has('project.view_budget'),
    canManageTeam: has('project.manage_team'),
    canApproveChanges: has('project.approve_changes'),
    canCreateRisks: has('project.create_risks'),
    canEditRisks: has('project.edit_risks'),
    canCreateIssues: has('project.create_issues'),
    canEditIssues: has('project.edit_issues'),
    canUploadDocuments: has('project.upload_documents'),
    canDelete: has('project.delete'),
    canCreateStatusReport: has('project.create_status_report'),
    canViewStatusReports: has('project.view_status_reports'),
  };
}

/**
 * Fetches the current user's permissions for a specific project.
 * When the backend API is available (VITE_API_URL set), calls /api/projects/:id/permissions
 * which enforces authorization server-side.
 * When no backend is available (local dev with Supabase directly), queries the database
 * directly to determine the user's role and permissions.
 */
export function useProjectPermissions(projectId: string | undefined) {
  const [permissions, setPermissions] = useState<ProjectPermissions>(EMPTY_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setPermissions(EMPTY_PERMISSIONS);
      setLoading(false);
      return;
    }

    fetchPermissions(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchPermissions = async (pid: string) => {
    try {
      setLoading(true);
      setError(null);

      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/projects/${pid}/permissions`);
        if (res.status === 403) {
          setPermissions({ ...EMPTY_PERMISSIONS, projectId: pid });
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch permissions: ${res.status}`);
        }
        const json = await res.json();
        setPermissions(json.data);
      } else {
        // Fallback for local dev without backend — query the database directly
        const { data: projectRow } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', pid)
          .maybeSingle();

        const { data: userRow } = await supabase
          .from('users')
          .select('system_role, resource_id, tenant_name')
          .eq('id', DEMO_USER_ID)
          .maybeSingle();

        const isOwner = projectRow?.owner_id === DEMO_USER_ID;

        if (isOwner) {
          setPermissions(buildPermissions(pid, ALL_PROJECT_PERMISSION_KEYS));
        } else {
          // A user may have multiple roles on the same project; their
          // effective permissions are the union of every role's permissions.
          let memberRows: { id: string; role: string | null }[] = [];
          if (userRow?.resource_id) {
            const { data } = await supabase
              .from('project_team_members')
              .select('id, role')
              .eq('project_id', pid)
              .eq('resource_id', userRow.resource_id);
            memberRows = data || [];
          }

          const memberIds = memberRows.map(m => m.id);
          const primaryRoles = memberRows.map(m => m.role);

          let additionalRoles: string[] = [];
          if (memberIds.length > 0) {
            const { data: roleRows } = await supabase
              .from('project_team_member_roles')
              .select('role_name')
              .in('team_member_id', memberIds);
            additionalRoles = (roleRows || []).map((r: any) => r.role_name);
          }

          const userRoles = await fetchUserSystemRoles(DEMO_USER_ID, userRow?.system_role);
          const orgPermissionKeys = await resolveGrantedPermissionKeys(userRoles, userRow?.tenant_name);
          const seesAllProjects = orgPermissionKeys.includes(VIEW_ALL_PROJECTS_PERMISSION);
          const canSeeProject = seesAllProjects || memberIds.length > 0;

          if (!canSeeProject) {
            setPermissions({ ...EMPTY_PERMISSIONS, projectId: pid });
          } else {
            const grantedKeys = await resolveGrantedPermissionKeys(
              [...userRoles, ...primaryRoles, ...additionalRoles],
              userRow?.tenant_name,
            );
            setPermissions(buildPermissions(pid, grantedKeys));
          }
        }
      }
    } catch (err: any) {
      console.error('Error fetching project permissions:', err);
      setError(err.message);
      setPermissions({ ...EMPTY_PERMISSIONS, projectId: pid || '' });
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, error, refetch: () => projectId && fetchPermissions(projectId) };
}
