import { useState, useEffect } from 'react';

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
 * When no backend is available (local dev with Supabase directly), returns full permissions
 * as a fallback (the Supabase RLS policies handle access control in that mode).
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
        // Fallback for local dev without backend — grant all permissions
        setPermissions({
          projectId: pid,
          permissions: ['project.view', 'project.edit_details', 'project.edit_schedule',
            'project.edit_budget', 'project.view_budget', 'project.manage_team',
            'project.approve_changes', 'project.create_risks', 'project.edit_risks',
            'project.create_issues', 'project.edit_issues', 'project.upload_documents',
            'project.delete', 'project.create_status_report', 'project.view_status_reports'],
          canView: true,
          canEditDetails: true,
          canEditSchedule: true,
          canEditBudget: true,
          canViewBudget: true,
          canManageTeam: true,
          canApproveChanges: true,
          canCreateRisks: true,
          canEditRisks: true,
          canCreateIssues: true,
          canEditIssues: true,
          canUploadDocuments: true,
          canDelete: true,
          canCreateStatusReport: true,
          canViewStatusReports: true,
        });
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
