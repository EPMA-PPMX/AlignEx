import React, { useState, useEffect } from 'react';
import { Shield, Users, Zap, Plus, CreditCard as Edit2, Check, X, Key, Calendar, TrendingUp, Briefcase, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { permissionService } from '../../lib/permissionService';
import { useNotification } from '../../lib/useNotification';
import { DEMO_USER_ID, DEMO_TENANT_NAME } from '../../lib/useCurrentUser';

interface UserLicense {
  id: string;
  user_email: string;
  organization_id: string;
  license_tier: string;
  is_active: boolean;
  assigned_date: string;
  last_access_date: string | null;
  notes: string | null;
  system_role_id: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface OrganizationModule {
  id: string;
  module_key: string;
  module_name: string;
  is_active: boolean;
  license_key: string | null;
  activation_date: string | null;
  expiry_date: string | null;
}

interface Organization {
  id: string;
  name: string;
}

export default function LicenseManagement() {
  const { showConfirm, showNotification } = useNotification();

  // Tenant-resolved state
  const [tenantOrg, setTenantOrg] = useState<Organization | null>(null);
  const [tenantOrgLoading, setTenantOrgLoading] = useState(true);

  const [userLicenses, setUserLicenses] = useState<UserLicense[]>([]);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [licenseTierOptions, setLicenseTierOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [showActivateModule, setShowActivateModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTier, setNewUserTier] = useState('');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit mode
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState('');
  const [editSystemRoleId, setEditSystemRoleId] = useState('');

  // Step 1: Resolve tenant org on mount
  useEffect(() => {
    resolveTenantOrg();
  }, []);

  const resolveTenantOrg = async () => {
    try {
      setTenantOrgLoading(true);

      // Fetch current user's tenant_name
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_name')
        .eq('id', DEMO_USER_ID)
        .maybeSingle();

      const tenantName = userData?.tenant_name || DEMO_TENANT_NAME;

      // Match against organizations.name (case-insensitive)
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', tenantName)
        .eq('is_active', true)
        .maybeSingle();

      setTenantOrg(orgData || null);
    } catch (err) {
      console.error('Error resolving tenant org:', err);
    } finally {
      setTenantOrgLoading(false);
    }
  };

  // Step 2: Load data once tenant org is known
  useEffect(() => {
    if (!tenantOrgLoading && tenantOrg) {
      loadData(tenantOrg.id);
    }
  }, [tenantOrg, tenantOrgLoading]);

  const loadData = async (orgId: string) => {
    try {
      setLoading(true);

      const [licensesResult, modulesResult, rolesResult, tierResult] = await Promise.all([
        supabase
          .from('user_licenses')
          .select('*')
          .eq('organization_id', orgId)
          .order('user_email'),
        supabase
          .from('organization_modules')
          .select('*')
          .eq('organization_id', orgId)
          .order('module_key'),
        supabase
          .from('roles')
          .select('id, name')
          .order('name'),
        supabase
          .from('typeoflicense')
          .select('licensetype')
          .order('licensetype', { ascending: true }),
      ]);

      if (licensesResult.error) throw licensesResult.error;
      if (modulesResult.error) throw modulesResult.error;

      const tiers = (tierResult.data || []).map((r: any) => r.licensetype as string);

      setUserLicenses(licensesResult.data || []);
      setModules(modulesResult.data || []);
      setRoles(rolesResult.data || []);
      setLicenseTierOptions(tiers);
      if (tiers.length > 0) setNewUserTier((prev) => prev || tiers[0]);
    } catch (error) {
      console.error('Error loading license data:', error);
      showNotification('Failed to load license data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantOrg) return;

    if (!newUserEmail.trim()) {
      showNotification('Please enter a user email', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_licenses')
        .insert([{
          user_email: newUserEmail.trim().toLowerCase(),
          organization_id: tenantOrg.id,
          license_tier: newUserTier,
          is_active: true,
          assigned_date: new Date().toISOString().split('T')[0],
          notes: newUserNotes.trim() || null,
          system_role_id: newUserRoleId || null,
        }]);

      if (error) {
        if (error.code === '23505') {
          showNotification('This user already has a license. Use the edit function to update it.', 'error');
        } else {
          throw error;
        }
        return;
      }

      showNotification('User license added successfully', 'success');
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserTier(licenseTierOptions[0] || '');
      setNewUserNotes('');
      setNewUserRoleId('');
      permissionService.clearCache();
      loadData(tenantOrg.id);
    } catch (error: any) {
      console.error('Error adding user license:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleUpdateUserTier = async (userId: string) => {
    if (!tenantOrg) return;
    try {
      const { error } = await supabase
        .from('user_licenses')
        .update({
          license_tier: editTier,
          system_role_id: editSystemRoleId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      showNotification('User license updated successfully', 'success');
      setEditingUserId(null);
      permissionService.clearCache();
      loadData(tenantOrg.id);
    } catch (error: any) {
      console.error('Error updating user license:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!tenantOrg) return;
    try {
      const { error } = await supabase
        .from('user_licenses')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      showNotification(`User license ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
      permissionService.clearCache();
      loadData(tenantOrg.id);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleActivateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule || !tenantOrg) return;

    try {
      const { error } = await supabase
        .from('organization_modules')
        .update({
          is_active: true,
          license_key: licenseKey.trim() || null,
          activation_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', tenantOrg.id)
        .eq('module_key', selectedModule);

      if (error) throw error;

      showNotification('Module activated successfully', 'success');
      setShowActivateModule(false);
      setSelectedModule(null);
      setLicenseKey('');
      setExpiryDate('');
      permissionService.clearCache();
      loadData(tenantOrg.id);
    } catch (error: any) {
      console.error('Error activating module:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleDeactivateModule = async (moduleKey: string) => {
    if (!tenantOrg) return;
    const confirmed = await showConfirm({
      title: 'Deactivate Module',
      message: `Are you sure you want to deactivate the ${moduleKey} module? Users will lose access to this feature.`,
      confirmText: 'Deactivate',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organization_modules')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('organization_id', tenantOrg.id)
        .eq('module_key', moduleKey);

      if (error) throw error;

      showNotification('Module deactivated successfully', 'success');
      permissionService.clearCache();
      loadData(tenantOrg.id);
    } catch (error: any) {
      console.error('Error deactivating module:', error);
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const getLicenseTierColor = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes('read')) return 'bg-gray-100 text-gray-800';
    if (t.includes('team')) return 'bg-blue-100 text-blue-800';
    if (t.includes('full')) return 'bg-green-100 text-green-800';
    if (t.includes('super')) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getModuleIcon = (moduleKey: string) => {
    switch (moduleKey) {
      case 'base': return Shield;
      case 'skills': return TrendingUp;
      case 'benefits': return Zap;
      default: return Shield;
    }
  };

  const stats = {
    total: userLicenses.length,
    active: userLicenses.filter(l => l.is_active).length,
    inactive: userLicenses.filter(l => !l.is_active).length,
    readOnly: userLicenses.filter(l => l.license_tier.toLowerCase().includes('read') && l.is_active).length,
    teamMember: userLicenses.filter(l => l.license_tier.toLowerCase().includes('team') && l.is_active).length,
    fullLicense: userLicenses.filter(l => l.license_tier.toLowerCase().includes('full') && l.is_active).length,
  };

  if (tenantOrgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenantOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <Building2 className="w-12 h-12 text-gray-300" />
        <p className="text-lg font-medium">No organisation found for your tenant.</p>
        <p className="text-sm">Contact your administrator to set up your organisation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">License Management</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            <span>Organisation: <span className="font-medium text-gray-700">{tenantOrg.name}</span></span>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-widget-bg rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Users</span>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <span className="text-sm font-medium text-gray-600">Read Only</span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.readOnly}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <span className="text-sm font-medium text-blue-900">Team Member</span>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.teamMember}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <span className="text-sm font-medium text-green-900">Full License</span>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.fullLicense}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <span className="text-sm font-medium text-red-900">Inactive</span>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.inactive}</p>
        </div>
      </div>

      {/* Organization Modules */}
      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Organisation Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : modules.length === 0 ? (
            <p className="col-span-3 text-sm text-gray-500 text-center py-8">No modules configured for this organisation.</p>
          ) : modules.map((module) => {
            const Icon = getModuleIcon(module.module_key);
            const isBase = module.module_key === 'base';
            return (
              <div
                key={module.id}
                className={`rounded-lg p-6 border-2 ${module.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${module.is_active ? 'bg-green-100' : 'bg-gray-200'}`}>
                      <Icon className={`w-6 h-6 ${module.is_active ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{module.module_name}</h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${module.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {module.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                {module.activation_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Activated: {new Date(module.activation_date).toLocaleDateString()}</span>
                  </div>
                )}
                {module.expiry_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>Expires: {new Date(module.expiry_date).toLocaleDateString()}</span>
                  </div>
                )}
                {!isBase && (
                  <div className="mt-4">
                    {module.is_active ? (
                      <button
                        onClick={() => handleDeactivateModule(module.module_key)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Deactivate Module
                      </button>
                    ) : (
                      <button
                        onClick={() => { setSelectedModule(module.module_key); setShowActivateModule(true); }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Activate Module
                      </button>
                    )}
                  </div>
                )}
                {isBase && (
                  <p className="text-xs text-gray-500 mt-4">Base module is always active and included with all licenses</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Licenses */}
      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900">User Licenses</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {userLicenses.length} user{userLicenses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Access</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No user licenses found for <strong>{tenantOrg.name}</strong>.
                    </td>
                  </tr>
                ) : userLicenses.map((license) => (
                  <tr key={license.id} className={!license.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{license.user_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingUserId === license.id ? (
                        <select
                          value={editSystemRoleId}
                          onChange={(e) => setEditSystemRoleId(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="">— No Role —</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      ) : license.system_role_id ? (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{roles.find(r => r.id === license.system_role_id)?.name || '-'}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingUserId === license.id ? (
                        <select
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          {licenseTierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getLicenseTierColor(license.license_tier)}`}>
                          {license.license_tier}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${license.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {license.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(license.assigned_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {license.last_access_date ? new Date(license.last_access_date).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingUserId === license.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdateUserTier(license.id)} className="text-green-600 hover:text-green-900">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingUserId(null)} className="text-red-600 hover:text-red-900">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setEditingUserId(license.id); setEditTier(license.license_tier); setEditSystemRoleId(license.system_role_id || ''); }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(license.id, license.is_active)}
                            className={license.is_active ? 'text-red-600 hover:text-red-900 text-xs' : 'text-green-600 hover:text-green-900 text-xs'}
                          >
                            {license.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-widget-bg rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Add User License</h3>
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Organisation: <span className="font-medium text-gray-700">{tenantOrg.name}</span>
            </p>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Email *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Tier *</label>
                <select
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {licenseTierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={newUserRoleId}
                    onChange={(e) => setNewUserRoleId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">— No Role —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddUser(false); setNewUserEmail(''); setNewUserTier(licenseTierOptions[0] || ''); setNewUserNotes(''); setNewUserRoleId(''); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate Module Modal */}
      {showActivateModule && selectedModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-widget-bg rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Activate {modules.find(m => m.module_key === selectedModule)?.module_name}
            </h3>
            <form onSubmit={handleActivateModule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Key (Optional)</label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Once activated, all users in <strong>{tenantOrg.name}</strong> will be able to access this module based on their license tier permissions.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Activate Module
                </button>
                <button
                  type="button"
                  onClick={() => { setShowActivateModule(false); setSelectedModule(null); setLicenseKey(''); setExpiryDate(''); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
