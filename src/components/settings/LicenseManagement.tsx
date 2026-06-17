import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Users, Zap, Plus, CreditCard as Edit2, Check, X, Calendar, TrendingUp, Briefcase, Building2, Filter, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { permissionService } from '../../lib/permissionService';
import { usePermissions } from '../../lib/usePermissions';
import { useNotification } from '../../lib/useNotification';
import { DEMO_TENANT_NAME } from '../../lib/useCurrentUser';

interface UserLicense {
  id: string;
  user_email: string;
  first_name: string | null;
  last_name: string | null;
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
  total_licenses: number | null;
}

export default function LicenseManagement() {
  const { showConfirm, showNotification } = useNotification();
  const { licenseTier, loading: permLoading } = usePermissions();
  const isSuperUser = !permLoading && licenseTier === 'Super User license';

  // Tenant-resolved state (used for non-super users)
  const [tenantOrg, setTenantOrg] = useState<Organization | null>(null);
  const [tenantOrgLoading, setTenantOrgLoading] = useState(true);

  // All orgs (used for super user)
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);

  const [userLicenses, setUserLicenses] = useState<UserLicense[]>([]);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [licenseTierOptions, setLicenseTierOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterOrg, setFilterOrg] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');

  // Form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [showActivateModule, setShowActivateModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserTier, setNewUserTier] = useState('');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');
  const [newUserOrgId, setNewUserOrgId] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit mode
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState('');
  const [editSystemRoleId, setEditSystemRoleId] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');

  // Resolve tenant org on mount (runs for all users; super users also load all orgs)
  useEffect(() => {
    if (permLoading) return;
    resolveTenantAndOrgs();
  }, [permLoading, isSuperUser]);

  const resolveTenantAndOrgs = async () => {
    try {
      setTenantOrgLoading(true);

      const tenantName = DEMO_TENANT_NAME;

      // Always resolve tenant org
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, total_licenses')
        .ilike('name', tenantName)
        .eq('is_active', true)
        .maybeSingle();

      setTenantOrg(orgData || null);

      if (isSuperUser) {
        // Super user also loads all orgs for the filter
        const { data: allOrgs } = await supabase
          .from('organizations')
          .select('id, name, total_licenses')
          .eq('is_active', true)
          .order('name');
        setAllOrganizations(allOrgs || []);
      }
    } catch (err) {
      console.error('Error resolving tenant org:', err);
    } finally {
      setTenantOrgLoading(false);
    }
  };

  // Load data once tenant is resolved
  useEffect(() => {
    if (tenantOrgLoading || permLoading) return;
    if (!isSuperUser && !tenantOrg) return;
    loadData();
  }, [tenantOrg, tenantOrgLoading, isSuperUser, permLoading]);

  const loadData = async () => {
    try {
      setLoading(true);

      const licensesQuery = isSuperUser
        ? supabase.from('user_licenses').select('*').order('user_email')
        : supabase.from('user_licenses').select('*').eq('organization_id', tenantOrg!.id).order('user_email');

      const modulesOrgId = isSuperUser
        ? (tenantOrg?.id ?? allOrganizations[0]?.id ?? '00000000-0000-0000-0000-000000000001')
        : tenantOrg!.id;

      const [licensesResult, modulesResult, rolesResult, tierResult] = await Promise.all([
        licensesQuery,
        supabase.from('organization_modules').select('*').eq('organization_id', modulesOrgId).order('module_key'),
        supabase.from('roles').select('id, name').order('name'),
        supabase.from('typeoflicense').select('licensetype').order('licensetype', { ascending: true }),
      ]);

      if (licensesResult.error) throw licensesResult.error;
      if (modulesResult.error) throw modulesResult.error;

      const tiers = (tierResult.data || []).map((r: any) => r.licensetype as string);

      setUserLicenses(licensesResult.data || []);
      setModules(modulesResult.data || []);
      setRoles(rolesResult.data || []);
      setLicenseTierOptions(tiers);
      if (tiers.length > 0) setNewUserTier((prev) => prev || tiers[0]);
      if (!newUserOrgId) setNewUserOrgId(tenantOrg?.id || allOrganizations[0]?.id || '');
    } catch (error) {
      console.error('Error loading license data:', error);
      showNotification('Failed to load license data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeOrgId = isSuperUser
    ? (filterOrg !== 'all' ? filterOrg : tenantOrg?.id || '')
    : tenantOrg?.id || '';

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) { showNotification('Please enter a user email', 'error'); return; }

    const orgId = isSuperUser ? newUserOrgId : tenantOrg!.id;
    if (!orgId) { showNotification('No organisation selected', 'error'); return; }

    // Check license cap for the selected organisation
    const allOrgs = [...allOrganizations, ...(tenantOrg ? [tenantOrg] : [])];
    const selectedOrg = allOrgs.find(o => o.id === orgId);
    if (selectedOrg?.total_licenses != null) {
      const currentCount = userLicenses.filter(l => l.organization_id === orgId).length;
      if (currentCount >= selectedOrg.total_licenses) {
        showNotification(
          `This organisation has reached its license limit of ${selectedOrg.total_licenses}. Please contact EPMA to extend your number of licenses.`,
          'error'
        );
        return;
      }
    }

    try {
      const { error } = await supabase.from('user_licenses').insert([{
        user_email: newUserEmail.trim().toLowerCase(),
        first_name: newUserFirstName.trim() || null,
        last_name: newUserLastName.trim() || null,
        organization_id: orgId,
        license_tier: newUserTier,
        is_active: true,
        assigned_date: new Date().toISOString().split('T')[0],
        notes: newUserNotes.trim() || null,
        system_role_id: newUserRoleId || null,
      }]);

      if (error) {
        if (error.code === '23505') {
          showNotification('This user already has a license. Use the edit function to update it.', 'error');
        } else throw error;
        return;
      }

      showNotification('User license added successfully', 'success');
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserTier(licenseTierOptions[0] || '');
      setNewUserNotes('');
      setNewUserRoleId('');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const confirmed = await showConfirm({
      title: 'Delete User License',
      message: `Are you sure you want to permanently delete the license for ${userEmail}? This action cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('user_licenses').delete().eq('id', userId);
      if (error) throw error;
      showNotification('User license deleted successfully', 'success');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleUpdateUserTier = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_licenses').update({
        license_tier: editTier,
        system_role_id: editSystemRoleId || null,
        first_name: editFirstName.trim() || null,
        last_name: editLastName.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) throw error;
      showNotification('User license updated successfully', 'success');
      setEditingUserId(null);
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from('user_licenses').update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);

      if (error) throw error;
      showNotification(`User license ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleActivateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;

    try {
      const { error } = await supabase.from('organization_modules').update({
        is_active: true,
        license_key: licenseKey.trim() || null,
        activation_date: new Date().toISOString().split('T')[0],
        expiry_date: expiryDate || null,
        updated_at: new Date().toISOString(),
      }).eq('organization_id', activeOrgId).eq('module_key', selectedModule);

      if (error) throw error;
      showNotification('Module activated successfully', 'success');
      setShowActivateModule(false);
      setSelectedModule(null);
      setLicenseKey('');
      setExpiryDate('');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleDeactivateModule = async (moduleKey: string) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Module',
      message: `Are you sure you want to deactivate the ${moduleKey} module? Users will lose access to this feature.`,
      confirmText: 'Deactivate',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('organization_modules').update({
        is_active: false,
        updated_at: new Date().toISOString(),
      }).eq('organization_id', activeOrgId).eq('module_key', moduleKey);

      if (error) throw error;
      showNotification('Module deactivated successfully', 'success');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
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

  const getOrgName = (orgId: string) => {
    const all = [...allOrganizations, ...(tenantOrg ? [tenantOrg] : [])];
    return all.find(o => o.id === orgId)?.name || '-';
  };

  // Apply filters to the license list
  const filteredLicenses = useMemo(() => {
    return userLicenses.filter(l => {
      if (isSuperUser && filterOrg !== 'all' && l.organization_id !== filterOrg) return false;
      if (filterTier !== 'all' && l.license_tier !== filterTier) return false;
      return true;
    });
  }, [userLicenses, filterOrg, filterTier, isSuperUser]);

  const stats = useMemo(() => ({
    total: filteredLicenses.length,
    active: filteredLicenses.filter(l => l.is_active).length,
    inactive: filteredLicenses.filter(l => !l.is_active).length,
    readOnly: filteredLicenses.filter(l => l.license_tier.toLowerCase().includes('read') && l.is_active).length,
    teamMember: filteredLicenses.filter(l => l.license_tier.toLowerCase().includes('team') && l.is_active).length,
    fullLicense: filteredLicenses.filter(l => l.license_tier.toLowerCase().includes('full') && l.is_active).length,
  }), [filteredLicenses]);

  if (tenantOrgLoading || permLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSuperUser && !tenantOrg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
        <Building2 className="w-12 h-12 text-gray-300" />
        <p className="text-lg font-medium">No organisation found for your tenant.</p>
        <p className="text-sm">Contact your administrator to set up your organisation.</p>
      </div>
    );
  }

  const displayOrg = isSuperUser
    ? (filterOrg !== 'all' ? allOrganizations.find(o => o.id === filterOrg)?.name : 'All Organisations')
    : tenantOrg?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">License Management</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="w-4 h-4" />
            <span>
              {isSuperUser ? (
                <span className="font-medium text-amber-700">Super User — Viewing: {displayOrg}</span>
              ) : (
                <>Organisation: <span className="font-medium text-gray-700">{tenantOrg?.name}</span></>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
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

      {/* Organisation Modules */}
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
              <div key={module.id} className={`rounded-lg p-6 border-2 ${module.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
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
                      <button onClick={() => handleDeactivateModule(module.module_key)} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                        Deactivate Module
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedModule(module.module_key); setShowActivateModule(true); }} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                        Activate Module
                      </button>
                    )}
                  </div>
                )}
                {isBase && <p className="text-xs text-gray-500 mt-4">Base module is always active and included with all licenses</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Licenses */}
      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900">User Licenses</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {filteredLicenses.length} user{filteredLicenses.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Organisation filter — Super User only */}
            {isSuperUser && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select
                  value={filterOrg}
                  onChange={(e) => setFilterOrg(e.target.value)}
                  className="pl-2 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Organisations</option>
                  {allOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* License Tier filter — everyone */}
            <div className="flex items-center gap-2">
              {!isSuperUser && <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="pl-2 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All License Tiers</option>
                {licenseTierOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                  {isSuperUser && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organisation</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Access</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperUser ? 10 : 9} className="px-6 py-12 text-center text-gray-500">
                      No user licenses match the current filters.
                    </td>
                  </tr>
                ) : filteredLicenses.map((license) => (
                  <tr key={license.id} className={!license.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{license.user_email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {editingUserId === license.id ? (
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First name"
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span>{license.first_name || <span className="text-gray-400">—</span>}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {editingUserId === license.id ? (
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last name"
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span>{license.last_name || <span className="text-gray-400">—</span>}</span>
                      )}
                    </td>
                    {isSuperUser && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          {getOrgName(license.organization_id)}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {editingUserId === license.id ? (
                        <select value={editSystemRoleId} onChange={(e) => setEditSystemRoleId(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
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
                        <select value={editTier} onChange={(e) => setEditTier(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
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
                          <button onClick={() => handleUpdateUserTier(license.id)} className="text-green-600 hover:text-green-900"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingUserId(null)} className="text-red-600 hover:text-red-900"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button onClick={() => { setEditingUserId(license.id); setEditTier(license.license_tier); setEditSystemRoleId(license.system_role_id || ''); setEditFirstName(license.first_name || ''); setEditLastName(license.last_name || ''); }} className="text-blue-600 hover:text-blue-900">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleUserStatus(license.id, license.is_active)} className={`text-xs ${license.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}>
                            {license.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDeleteUser(license.id, license.user_email)} className="text-gray-400 hover:text-red-600 transition-colors" title="Delete license">
                            <Trash2 className="w-4 h-4" />
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
            {!isSuperUser && (
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Organisation: <span className="font-medium text-gray-700">{tenantOrg?.name}</span>
              </p>
            )}
            {/* License cap indicator */}
            {(() => {
              const orgId = isSuperUser ? newUserOrgId : tenantOrg?.id;
              const allOrgs = [...allOrganizations, ...(tenantOrg ? [tenantOrg] : [])];
              const selectedOrg = orgId ? allOrgs.find(o => o.id === orgId) : null;
              if (!selectedOrg?.total_licenses) return null;
              const used = userLicenses.filter(l => l.organization_id === orgId).length;
              const remaining = selectedOrg.total_licenses - used;
              const isAtLimit = remaining <= 0;
              return (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-2 ${isAtLimit ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
                  <Users className="w-4 h-4 flex-shrink-0" />
                  {isAtLimit
                    ? <span>License limit reached ({used}/{selectedOrg.total_licenses}). Contact EPMA to extend your number of licenses.</span>
                    : <span>{remaining} of {selectedOrg.total_licenses} licenses remaining</span>
                  }
                </div>
              );
            })()}
            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
              {isSuperUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisation *</label>
                  <select
                    value={newUserOrgId}
                    onChange={(e) => setNewUserOrgId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select organisation...</option>
                    {allOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Tier *</label>
                <select value={newUserTier} onChange={(e) => setNewUserTier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {licenseTierOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select value={newUserRoleId} onChange={(e) => setNewUserRoleId(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">— No Role —</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea value={newUserNotes} onChange={(e) => setNewUserNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} placeholder="Any additional notes..." />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Add User</button>
                <button type="button" onClick={() => { setShowAddUser(false); setNewUserEmail(''); setNewUserFirstName(''); setNewUserLastName(''); setNewUserTier(licenseTierOptions[0] || ''); setNewUserNotes(''); setNewUserRoleId(''); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
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
                <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="XXXX-XXXX-XXXX-XXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Once activated, all users in <strong>{isSuperUser ? displayOrg : tenantOrg?.name}</strong> will be able to access this module based on their license tier permissions.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Activate Module</button>
                <button type="button" onClick={() => { setShowActivateModule(false); setSelectedModule(null); setLicenseKey(''); setExpiryDate(''); }} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
