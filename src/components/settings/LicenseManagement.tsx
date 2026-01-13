import React, { useState, useEffect } from 'react';
import { Shield, Users, Zap, Plus, Edit2, Check, X, Key, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { permissionService } from '../../lib/permissionService';
import { useNotification } from '../../lib/useNotification';

interface UserLicense {
  id: string;
  user_email: string;
  license_tier: 'read_only' | 'team_member' | 'full_license';
  is_active: boolean;
  assigned_date: string;
  last_access_date: string | null;
  notes: string | null;
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

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';

export default function LicenseManagement() {
  const { showConfirm } = useNotification();
  const [userLicenses, setUserLicenses] = useState<UserLicense[]>([]);
  const [modules, setModules] = useState<OrganizationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showActivateModule, setShowActivateModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserTier, setNewUserTier] = useState<'read_only' | 'team_member' | 'full_license'>('team_member');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Edit mode
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState<'read_only' | 'team_member' | 'full_license'>('team_member');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [licensesResult, modulesResult] = await Promise.all([
        supabase
          .from('user_licenses')
          .select('*')
          .eq('organization_id', DEFAULT_ORG_ID)
          .order('user_email'),
        supabase
          .from('organization_modules')
          .select('*')
          .eq('organization_id', DEFAULT_ORG_ID)
          .order('module_key')
      ]);

      if (licensesResult.error) throw licensesResult.error;
      if (modulesResult.error) throw modulesResult.error;

      setUserLicenses(licensesResult.data || []);
      setModules(modulesResult.data || []);
    } catch (error) {
      console.error('Error loading license data:', error);
      alert('Failed to load license data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail.trim()) {
      alert('Please enter a user email');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_licenses')
        .insert([{
          user_email: newUserEmail.trim().toLowerCase(),
          organization_id: DEFAULT_ORG_ID,
          license_tier: newUserTier,
          is_active: true,
          assigned_date: new Date().toISOString().split('T')[0],
          notes: newUserNotes.trim() || null
        }]);

      if (error) {
        if (error.code === '23505') {
          alert('This user already has a license. Use the edit function to update it.');
        } else {
          throw error;
        }
        return;
      }

      alert('User license added successfully!');
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserTier('team_member');
      setNewUserNotes('');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      console.error('Error adding user license:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateUserTier = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_licenses')
        .update({
          license_tier: editTier,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      alert('User license updated successfully!');
      setEditingUserId(null);
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      console.error('Error updating user license:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_licenses')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      alert(`User license ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleActivateModule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModule) return;

    try {
      const { error } = await supabase
        .from('organization_modules')
        .update({
          is_active: true,
          license_key: licenseKey.trim() || null,
          activation_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate || null,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('module_key', selectedModule);

      if (error) throw error;

      alert('Module activated successfully!');
      setShowActivateModule(false);
      setSelectedModule(null);
      setLicenseKey('');
      setExpiryDate('');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      console.error('Error activating module:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeactivateModule = async (moduleKey: string) => {
    const confirmed = await showConfirm({
      title: 'Deactivate Module',
      message: `Are you sure you want to deactivate the ${moduleKey} module? Users will lose access to this feature.`,
      confirmText: 'Deactivate'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organization_modules')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', DEFAULT_ORG_ID)
        .eq('module_key', moduleKey);

      if (error) throw error;

      alert('Module deactivated successfully!');
      permissionService.clearCache();
      loadData();
    } catch (error: any) {
      console.error('Error deactivating module:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const getLicenseTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      read_only: 'Read Only',
      team_member: 'Team Member',
      full_license: 'Full License'
    };
    return labels[tier] || tier;
  };

  const getLicenseTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      read_only: 'bg-gray-100 text-gray-800',
      team_member: 'bg-blue-100 text-blue-800',
      full_license: 'bg-green-100 text-green-800'
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  const getModuleIcon = (moduleKey: string) => {
    switch (moduleKey) {
      case 'base':
        return Shield;
      case 'skills':
        return TrendingUp;
      case 'benefits':
        return Zap;
      default:
        return Shield;
    }
  };

  const calculateUsageStats = () => {
    const readOnly = userLicenses.filter(l => l.license_tier === 'read_only' && l.is_active).length;
    const teamMember = userLicenses.filter(l => l.license_tier === 'team_member' && l.is_active).length;
    const fullLicense = userLicenses.filter(l => l.license_tier === 'full_license' && l.is_active).length;
    const inactive = userLicenses.filter(l => !l.is_active).length;

    return { readOnly, teamMember, fullLicense, inactive, total: userLicenses.length };
  };

  const stats = calculateUsageStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">License Management</h2>
        <p className="text-gray-600">Manage user licenses and organization modules</p>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-widget-bg rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Users</span>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Read Only</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.readOnly}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Team Member</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{stats.teamMember}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Full License</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{stats.fullLicense}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-900">Inactive</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{stats.inactive}</p>
        </div>
      </div>

      {/* Organization Modules */}
      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Organization Modules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.map((module) => {
            const Icon = getModuleIcon(module.module_key);
            const isBase = module.module_key === 'base';

            return (
              <div
                key={module.id}
                className={`rounded-lg p-6 border-2 ${
                  module.is_active
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${module.is_active ? 'bg-green-100' : 'bg-gray-200'}`}>
                      <Icon className={`w-6 h-6 ${module.is_active ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{module.module_name}</h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        module.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}>
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
                        onClick={() => {
                          setSelectedModule(module.module_key);
                          setShowActivateModule(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Activate Module
                      </button>
                    )}
                  </div>
                )}

                {isBase && (
                  <p className="text-xs text-gray-500 mt-4">
                    Base module is always active and included with all licenses
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Licenses */}
      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">User Licenses</h3>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  License Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Access
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userLicenses.map((license) => (
                <tr key={license.id} className={!license.is_active ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {license.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingUserId === license.id ? (
                      <select
                        value={editTier}
                        onChange={(e) => setEditTier(e.target.value as any)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="read_only">Read Only</option>
                        <option value="team_member">Team Member</option>
                        <option value="full_license">Full License</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getLicenseTierColor(license.license_tier)}`}>
                        {getLicenseTierLabel(license.license_tier)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      license.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
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
                        <button
                          onClick={() => handleUpdateUserTier(license.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditingUserId(license.id);
                            setEditTier(license.license_tier);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(license.id, license.is_active)}
                          className={license.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
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
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-widget-bg rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Add User License</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Email *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Tier *
                </label>
                <select
                  value={newUserTier}
                  onChange={(e) => setNewUserTier(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="read_only">Read Only</option>
                  <option value="team_member">Team Member</option>
                  <option value="full_license">Full License</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {newUserTier === 'read_only' && 'View-only access to all data'}
                  {newUserTier === 'team_member' && 'Can enter timesheets and create requests'}
                  {newUserTier === 'full_license' && 'Complete access including project management'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newUserNotes}
                  onChange={(e) => setNewUserNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserTier('team_member');
                    setNewUserNotes('');
                  }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Key (Optional)
                </label>
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  Once activated, all users will be able to access this module based on their license tier permissions.
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Activate Module
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActivateModule(false);
                    setSelectedModule(null);
                    setLicenseKey('');
                    setExpiryDate('');
                  }}
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
