import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { DEMO_USER_ID } from './useCurrentUser';

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
        // 1. Check if user is owner or admin/PM (full permissions)
        // 2. Otherwise look up team member role and its permissions
        const { data: projectRow } = await supabase
          .from('projects')
          .select('owner_id')
          .eq('id', pid)
          .maybeSingle();

        const { data: userRow } = await supabase
          .from('users')
          .select('system_role, resource_id')
          .eq('id', DEMO_USER_ID)
          .maybeSingle();

        const isOwner = projectRow?.owner_id === DEMO_USER_ID;
        const isGlobalAdmin = userRow?.system_role === 'Admin';
        const isPortfolioManager = userRow?.system_role === 'Portfolio Manager';

        if (isOwner || isGlobalAdmin || isPortfolioManager) {
          setPermissions({
            projectId: pid,
            permissions: ['project.view', 'project.edit_details', 'project.edit_schedule',
              'project.edit_budget', 'project.view_budget', 'project.manage_team',
              'project.approve_changes', 'project.create_risks', 'project.edit_risks',
              'project.create_issues', 'project.edit_issues', 'project.upload_documents',
              'project.delete', 'project.create_status_report', 'project.view_status_reports'],
            canView: true, canEditDetails: true, canEditSchedule: true,
            canEditBudget: true, canViewBudget: true, canManageTeam: true,
            canApproveChanges: true, canCreateRisks: true, canEditRisks: true,
            canCreateIssues: true, canEditIssues: true, canUploadDocuments: true,
            canDelete: true, canCreateStatusReport: true, canViewStatusReports: true,
          });
        } else if (userRow?.resource_id) {
          // Look up the user's role on this project
          const { data: memberRow } = await supabase
            .from('project_team_members')
            .select('role')
            .eq('project_id', pid)
            .eq('resource_id', userRow.resource_id)
            .maybeSingle();

          if (memberRow?.role) {
            // Fetch permissions for this role
            const { data: rolePerms } = await supabase
              .from('project_role_permissions')
              .select('permission_key, can_execute')
              .eq('role_name', memberRow.role)
              .eq('can_execute', true);

            const permKeys = (rolePerms || []).map(p => p.permission_key);
            const has = (k: string) => permKeys.includes(k);

            setPermissions({
              projectId: pid,
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
            });
          } else {
            // User has no role on this project
            setPermissions({ ...EMPTY_PERMISSIONS, projectId: pid });
          }
        } else {
          setPermissions({ ...EMPTY_PERMISSIONS, projectId: pid });
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
