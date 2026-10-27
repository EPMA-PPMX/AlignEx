import React, { useState, useEffect } from 'react';
import { Plus, Building2, Mail, Globe, Check, X, Pencil, Trash2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  billing_email: string | null;
  is_active: boolean;
  total_licenses: number | null;
  created_at: string;
  updated_at: string;
}

const TenantManagement: React.FC = () => {
  const { showNotification, showConfirm } = useNotification();
  const [tenants, setTenants] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formBillingEmail, setFormBillingEmail] = useState('');
  const [formLicenses, setFormLicenses] = useState<string>('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching tenants:', error);
        showNotification('Failed to load tenants', 'error');
      } else {
        setTenants(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('Failed to load tenants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDomain('');
    setFormBillingEmail('');
    setFormLicenses('');
    setFormActive(true);
    setEditingId(null);
    setShowAdd(false);
  };

  const startEdit = (org: Organization) => {
    setEditingId(org.id);
    setFormName(org.name);
    setFormDomain(org.domain || '');
    setFormBillingEmail(org.billing_email || '');
    setFormLicenses(org.total_licenses != null ? String(org.total_licenses) : '');
    setFormActive(org.is_active);
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showNotification('Tenant name is required', 'error');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formName.trim(),
        domain: formDomain.trim() || null,
        billing_email: formBillingEmail.trim() || null,
        total_licenses: formLicenses.trim() ? parseInt(formLicenses, 10) : null,
        is_active: formActive,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('organizations')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showNotification('Tenant updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert([payload]);

        if (error) throw error;
        showNotification('Tenant registered successfully', 'success');
      }

      resetForm();
      fetchTenants();
    } catch (err: any) {
      console.error('Error saving tenant:', err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    const confirmed = await showConfirm({
      title: 'Delete Tenant',
      message: `Are you sure you want to delete "${org.name}"? This cannot be undone and may affect users and data linked to this tenant.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;
      showNotification('Tenant deleted', 'success');
      fetchTenants();
    } catch (err: any) {
      console.error('Error deleting tenant:', err);
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  const toggleActive = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          is_active: !org.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id);

      if (error) throw error;
      showNotification(`Tenant ${!org.is_active ? 'activated' : 'deactivated'}`, 'success');
      fetchTenants();
    } catch (err: any) {
      console.error('Error toggling tenant:', err);
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tenant Management</h2>
          <p className="text-gray-600">Register and manage the tenants (organizations) hosted on this platform.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-widget-bg rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Tenants</span>
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Active</span>
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{tenants.filter(t => t.is_active).length}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-900">Inactive</span>
            <X className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-900">{tenants.filter(t => !t.is_active).length}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Total Licenses</span>
            <KeyRound className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {tenants.reduce((sum, t) => sum + (t.total_licenses || 0), 0)}
          </p>
        </div>
      </div>

      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Registered Tenants</h3>

        {tenants.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tenants registered yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Licenses</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((org) => (
                  <tr key={org.id} className={!org.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        {org.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {org.domain ? (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-400" />
                          {org.domain}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {org.billing_email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {org.billing_email}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {org.total_licenses ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => startEdit(org)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit tenant"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(org)}
                          className={org.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        >
                          {org.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(org)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-widget-bg rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Tenant' : 'Register New Tenant'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formBillingEmail}
                  onChange={(e) => setFormBillingEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="billing@acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Licenses
                </label>
                <input
                  type="number"
                  min="0"
                  value={formLicenses}
                  onChange={(e) => setFormLicenses(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 50"
                />
              </div>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                  {editingId ? 'Save Changes' : 'Register Tenant'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
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
};

export default TenantManagement;
