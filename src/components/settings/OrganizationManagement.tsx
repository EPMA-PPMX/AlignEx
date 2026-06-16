import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, Check, X, Globe, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface Organization {
  id: string;
  name: string;
  domain: string | null;
  billing_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = { name: '', domain: '', billing_email: '' };

export default function OrganizationManagement() {
  const { showConfirm, showNotification } = useNotification();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      showNotification('Failed to load organisations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingOrg(null);
    setShowAddModal(true);
  };

  const openEdit = (org: Organization) => {
    setForm({ name: org.name, domain: org.domain || '', billing_email: org.billing_email || '' });
    setEditingOrg(org);
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showNotification('Organisation name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        domain: form.domain.trim() || null,
        billing_email: form.billing_email.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingOrg) {
        const { error } = await supabase.from('organizations').update(payload).eq('id', editingOrg.id);
        if (error) throw error;
        showNotification('Organisation updated successfully', 'success');
      } else {
        const { error } = await supabase.from('organizations').insert([{ ...payload, is_active: true }]);
        if (error) throw error;
        showNotification('Organisation added successfully', 'success');
      }

      setShowAddModal(false);
      setEditingOrg(null);
      setForm(emptyForm);
      loadOrganizations();
    } catch (error: any) {
      console.error('Error saving organisation:', error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active, updated_at: new Date().toISOString() })
        .eq('id', org.id);
      if (error) throw error;
      showNotification(`Organisation ${!org.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadOrganizations();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleDelete = async (org: Organization) => {
    const confirmed = await showConfirm({
      title: 'Delete Organisation',
      message: `Are you sure you want to delete "${org.name}"? This may affect associated licenses and modules.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('organizations').delete().eq('id', org.id);
      if (error) throw error;
      showNotification('Organisation deleted', 'success');
      loadOrganizations();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingOrg(null);
    setForm(emptyForm);
  };

  const stats = {
    total: organizations.length,
    active: organizations.filter(o => o.is_active).length,
    inactive: organizations.filter(o => !o.is_active).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Organisation Management</h2>
        <p className="text-gray-600">Add and manage organisations in the system.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-widget-bg rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm font-medium text-green-700 mb-1">Active</p>
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm font-medium text-red-700 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-red-800">{stats.inactive}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Organisations</h3>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Organisation
          </button>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No organisations yet. Click "Add Organisation" to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Billing Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" style={{ backgroundColor: '#F9F7FC' }}>
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.domain ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          {org.domain}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {org.billing_email ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {org.billing_email}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(org.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(org)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(org)}
                          className={`p-1 rounded transition-colors ${org.is_active ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' : 'text-green-600 hover:text-green-800 hover:bg-green-50'}`}
                          title={org.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {org.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(org)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
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

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingOrg ? 'Edit Organisation' : 'Add Organisation'}
                </h3>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Acme Corporation"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.domain}
                    onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="acme.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Email <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.billing_email}
                    onChange={(e) => setForm(f => ({ ...f, billing_email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="billing@acme.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : editingOrg ? 'Update Organisation' : 'Add Organisation'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
