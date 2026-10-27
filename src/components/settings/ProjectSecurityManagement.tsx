import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';
import { DEMO_TENANT_NAME } from '../../lib/useCurrentUser';

interface ProjectRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string;
  sort_order: number;
  is_system_role: boolean;
  tenant_name: string | null;
}

interface RolePermission {
  id: string;
  role_name: string;
  permission_key: string;
  can_execute: boolean;
  tenant_name: string | null;
}

const ALL_PERMISSIONS = [
  { key: 'project.view', label: 'View Project', description: 'Can see the project and its details' },
  { key: 'project.edit_details', label: 'Edit Details', description: 'Can edit project name, description, status, custom fields' },
  { key: 'project.edit_schedule', label: 'Edit Schedule', description: 'Can edit tasks, Gantt chart, schedule dates' },
  { key: 'project.edit_tasks_assigned', label: 'Edit Assigned Tasks', description: 'Can edit tasks assigned to them' },
  { key: 'project.edit_budget', label: 'Edit Budget', description: 'Can edit budget categories and forecasts' },
  { key: 'project.view_budget', label: 'View Budget', description: 'Can view budget data (read-only)' },
  { key: 'project.manage_team', label: 'Manage Team', description: 'Can add/remove team members and change roles' },
  { key: 'project.approve_changes', label: 'Approve Changes', description: 'Can approve/reject change requests' },
  { key: 'project.create_risks', label: 'Create Risks', description: 'Can add new risks to the risk register' },
  { key: 'project.edit_risks', label: 'Edit Risks', description: 'Can edit and delete risks' },
  { key: 'project.create_issues', label: 'Create Issues', description: 'Can add new issues to the issue log' },
  { key: 'project.edit_issues', label: 'Edit Issues', description: 'Can edit and delete issues' },
  { key: 'project.upload_documents', label: 'Upload Documents', description: 'Can upload and delete project documents' },
  { key: 'project.delete', label: 'Delete Project', description: 'Can archive or delete the project' },
  { key: 'project.create_status_report', label: 'Create Status Reports', description: 'Can create new status reports' },
  { key: 'project.view_status_reports', label: 'View Status Reports', description: 'Can view status reports (read-only)' },
  { key: 'project.approve_request', label: 'Approve Project Requests', description: 'Can approve or reject project initiation requests' },
];

const ProjectSecurityManagement: React.FC = () => {
  const { showNotification } = useNotification();
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDisplayName, setNewRoleDisplayName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      // Global system roles (tenant_name IS NULL) + this org's custom roles.
      const { data, error } = await supabase
        .from('project_roles')
        .select('*')
        .or(`tenant_name.is.null,tenant_name.eq.${DEMO_TENANT_NAME}`)
        .order('sort_order');
      if (error) throw error;
      setRoles(data || []);
      if (data && data.length > 0 && !selectedRole) {
        setSelectedRole(data[0].role_name);
      }
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      showNotification('Failed to load project roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      // Global mappings + this org's overrides.
      const { data, error } = await supabase
        .from('project_role_permissions')
        .select('*')
        .or(`tenant_name.is.null,tenant_name.eq.${DEMO_TENANT_NAME}`);
      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      console.error('Error fetching permissions:', err);
    }
  };

  const getPermissionState = (roleName: string, permKey: string): boolean => {
    // Prefer a tenant-specific override; fall back to the global mapping.
    const tenantPerm = permissions.find(
      p => p.role_name === roleName && p.permission_key === permKey && p.tenant_name === DEMO_TENANT_NAME
    );
    if (tenantPerm) return tenantPerm.can_execute;
    const globalPerm = permissions.find(
      p => p.role_name === roleName && p.permission_key === permKey && p.tenant_name === null
    );
    return globalPerm ? globalPerm.can_execute : false;
  };

  const togglePermission = async (roleName: string, permKey: string, currentValue: boolean) => {
    setSaving(true);
    try {
      // Prefer updating a tenant-specific override; otherwise the global mapping.
      const tenantExisting = permissions.find(
        p => p.role_name === roleName && p.permission_key === permKey && p.tenant_name === DEMO_TENANT_NAME
      );
      const globalExisting = permissions.find(
        p => p.role_name === roleName && p.permission_key === permKey && p.tenant_name === null
      );
      const target = tenantExisting || globalExisting;

      // For system/global roles, toggling creates a tenant-scoped override so the
      // global default is preserved for other organizations.
      const isGlobalRole = roles.find(r => r.role_name === roleName)?.tenant_name === null;
      const shouldCreateTenantOverride = isGlobalRole && !tenantExisting;

      if (target && !shouldCreateTenantOverride) {
        const { error } = await supabase
          .from('project_role_permissions')
          .update({ can_execute: !currentValue })
          .eq('id', target.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('project_role_permissions')
          .insert({
            role_name: roleName,
            permission_key: permKey,
            can_execute: true,
            tenant_name: isGlobalRole ? DEMO_TENANT_NAME : null,
          });
        if (error) throw error;
      }
      await fetchPermissions();
      showNotification('Permission updated', 'success');
    } catch (err: any) {
      console.error('Error updating permission:', err);
      showNotification('Failed to update permission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || !newRoleDisplayName.trim()) {
      showNotification('Role name and display name are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_roles')
        .insert({
          role_name: newRoleName.trim(),
          display_name: newRoleDisplayName.trim(),
          description: newRoleDescription.trim() || null,
          sort_order: roles.length + 1,
          is_system_role: false,
          tenant_name: DEMO_TENANT_NAME,
        });
      if (error) throw error;
      setShowAddRoleModal(false);
      setNewRoleName('');
      setNewRoleDisplayName('');
      setNewRoleDescription('');
      await fetchRoles();
      showNotification('Role created successfully', 'success');
    } catch (err: any) {
      console.error('Error adding role:', err);
      showNotification(err.message || 'Failed to create role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: ProjectRole) => {
    if (role.is_system_role) {
      showNotification('System roles cannot be deleted', 'error');
      return;
    }
    if (!confirm(`Delete role "${role.display_name}"? This will remove all permissions for this role.`)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('project_roles')
        .delete()
        .eq('id', role.id);
      if (error) throw error;
      await fetchRoles();
      await fetchPermissions();
      if (selectedRole === role.role_name && roles.length > 0) {
        setSelectedRole(roles[0].role_name);
      }
      showNotification('Role deleted', 'success');
    } catch (err: any) {
      console.error('Error deleting role:', err);
      showNotification('Failed to delete role', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Security</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage project-level roles and permissions (MS Project Server-style RBAC).
          </p>
        </div>
        <button
          onClick={() => setShowAddRoleModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role list */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Project Roles</h3>
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.role_name
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                  onClick={() => setSelectedRole(role.role_name)}
                >
                  <div className="flex items-center space-x-3">
                    <Shield className={`w-4 h-4 ${selectedRole === role.role_name ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{role.display_name}</div>
                      <div className="text-xs text-gray-500">{role.role_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {role.is_system_role && (
                      <Lock className="w-3 h-3 text-gray-400" title="System role" />
                    )}
                    {role.tenant_name && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded" title={`Custom role for ${role.tenant_name}`}>
                        Custom
                      </span>
                    )}
                    {!role.is_system_role && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRole(role); }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permission matrix */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Permissions for: <span className="text-blue-600">{roles.find(r => r.role_name === selectedRole)?.display_name}</span>
                </h3>
                {saving && <span className="text-xs text-gray-400">Saving...</span>}
              </div>
              <div className="space-y-1">
                {ALL_PERMISSIONS.map((perm) => {
                  const enabled = getPermissionState(selectedRole, perm.key);
                  return (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{perm.label}</div>
                        <div className="text-xs text-gray-500">{perm.description}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => togglePermission(selectedRole, perm.key, enabled)}
                          disabled={saving}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a role to view its permissions
            </div>
          )}
        </div>
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Project Role</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name (internal)</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. project_approver"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Use lowercase with underscores. This is the system identifier.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newRoleDisplayName}
                  onChange={(e) => setNewRoleDisplayName(e.target.value)}
                  placeholder="e.g. Project Approver"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  rows={2}
                  placeholder="What can this role do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRole}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSecurityManagement;
