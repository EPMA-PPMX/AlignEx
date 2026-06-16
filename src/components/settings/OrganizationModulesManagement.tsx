import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Pencil, Trash2, Check, X, Search,
  Shield, TrendingUp, Zap, Key, Calendar, Building2,
  ToggleLeft, ToggleRight, Filter, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface Organization {
  id: string;
  name: string;
}

interface OrgModule {
  id: string;
  organization_id: string;
  module_key: 'base' | 'skills' | 'benefits';
  module_name: string;
  is_active: boolean;
  license_key: string | null;
  activation_date: string | null;
  expiry_date: string | null;
  purchased_date: string | null;
  renewal_date: string | null;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

const MODULE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  base:     { icon: Shield,    color: 'text-blue-600',  bg: 'bg-blue-50',   border: 'border-blue-200' },
  skills:   { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50',  border: 'border-green-200' },
  benefits: { icon: Zap,       color: 'text-amber-600', bg: 'bg-amber-50',  border: 'border-amber-200' },
};

const MODULE_KEYS = ['base', 'skills', 'benefits'] as const;

const emptyForm = {
  organization_id: '',
  module_key: 'base' as const,
  module_name: '',
  is_active: false,
  license_key: '',
  activation_date: '',
  expiry_date: '',
  purchased_date: '',
  renewal_date: '',
};

type FormState = typeof emptyForm;

export default function OrganizationModulesManagement() {
  const { showConfirm, showNotification } = useNotification();
  const [modules, setModules] = useState<OrgModule[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterModuleKey, setFilterModuleKey] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState<OrgModule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modsResult, orgsResult] = await Promise.all([
        supabase
          .from('organization_modules')
          .select('*, organization:organizations(id, name)')
          .order('organization_id')
          .order('module_key'),
        supabase.from('organizations').select('id, name').order('name'),
      ]);
      if (modsResult.error) throw modsResult.error;
      if (orgsResult.error) throw orgsResult.error;
      setModules(modsResult.data || []);
      setOrganizations(orgsResult.data || []);
    } catch (err: any) {
      showNotification('Failed to load modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ ...emptyForm, organization_id: organizations[0]?.id || '' });
    setEditingModule(null);
    setShowModal(true);
  };

  const openEdit = (mod: OrgModule) => {
    setForm({
      organization_id: mod.organization_id,
      module_key: mod.module_key,
      module_name: mod.module_name,
      is_active: mod.is_active,
      license_key: mod.license_key || '',
      activation_date: mod.activation_date || '',
      expiry_date: mod.expiry_date || '',
      purchased_date: mod.purchased_date || '',
      renewal_date: mod.renewal_date || '',
    });
    setEditingModule(mod);
    setShowModal(true);
  };

  // Auto-fill module_name when module_key changes
  const handleModuleKeyChange = (key: typeof MODULE_KEYS[number]) => {
    const names: Record<string, string> = {
      base: 'Base Platform',
      skills: 'Skills Management',
      benefits: 'Benefit Realization',
    };
    setForm(f => ({ ...f, module_key: key, module_name: names[key] }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organization_id) { showNotification('Select an organisation', 'error'); return; }
    if (!form.module_name.trim()) { showNotification('Module name is required', 'error'); return; }
    setSaving(true);

    const payload = {
      organization_id: form.organization_id,
      module_key: form.module_key,
      module_name: form.module_name.trim(),
      is_active: form.is_active,
      license_key: form.license_key.trim() || null,
      activation_date: form.activation_date || null,
      expiry_date: form.expiry_date || null,
      purchased_date: form.purchased_date || null,
      renewal_date: form.renewal_date || null,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingModule) {
        const { error } = await supabase
          .from('organization_modules')
          .update(payload)
          .eq('id', editingModule.id);
        if (error) throw error;
        showNotification('Module updated', 'success');
      } else {
        const { error } = await supabase
          .from('organization_modules')
          .insert([payload]);
        if (error) throw error;
        showNotification('Module added', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Error saving module', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (mod: OrgModule) => {
    try {
      const { error } = await supabase
        .from('organization_modules')
        .update({ is_active: !mod.is_active, updated_at: new Date().toISOString() })
        .eq('id', mod.id);
      if (error) throw error;
      showNotification(`Module ${!mod.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDelete = async (mod: OrgModule) => {
    const confirmed = await showConfirm({
      title: 'Delete Module',
      message: `Delete "${mod.module_name}" for ${mod.organization?.name}? This cannot be undone.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('organization_modules').delete().eq('id', mod.id);
      if (error) throw error;
      showNotification('Module deleted', 'success');
      loadData();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const filtered = modules.filter(m => {
    const orgName = m.organization?.name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    const matchSearch = !search || m.module_name.toLowerCase().includes(search) || orgName.includes(search) || m.license_key?.toLowerCase().includes(search);
    const matchOrg = !filterOrg || m.organization_id === filterOrg;
    const matchKey = !filterModuleKey || m.module_key === filterModuleKey;
    const matchStatus = !filterStatus || (filterStatus === 'active' ? m.is_active : !m.is_active);
    return matchSearch && matchOrg && matchKey && matchStatus;
  });

  const stats = {
    total: modules.length,
    active: modules.filter(m => m.is_active).length,
    inactive: modules.filter(m => !m.is_active).length,
    expiringSoon: modules.filter(m => {
      if (!m.expiry_date) return false;
      const days = (new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days > 0 && days <= 30;
    }).length,
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
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Organisation Modules</h2>
        <p className="text-gray-600">Manage module subscriptions across all organisations.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Active</p>
          <p className="text-2xl font-bold text-green-800">{stats.active}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Inactive</p>
          <p className="text-2xl font-bold text-red-800">{stats.inactive}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-800">{stats.expiringSoon}</p>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules, orgs, keys..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            >
              <option value="">All Organisations</option>
              {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterModuleKey}
              onChange={e => setFilterModuleKey(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
            >
              <option value="">All Modules</option>
              <option value="base">Base Platform</option>
              <option value="skills">Skills Management</option>
              <option value="benefits">Benefit Realization</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium ml-auto"
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No modules found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new module.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Module</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Organisation</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">License Key</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Activation</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Renewal</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(mod => {
                  const meta = MODULE_META[mod.module_key] || MODULE_META.base;
                  const Icon = meta.icon;
                  const isExpired = mod.expiry_date && new Date(mod.expiry_date) < new Date();
                  const expiringSoon = mod.expiry_date && !isExpired && (new Date(mod.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;

                  return (
                    <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${meta.bg} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{mod.module_name}</p>
                            <p className="text-xs text-gray-500 capitalize">{mod.module_key}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{mod.organization?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mod.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {mod.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {mod.license_key ? (
                          <div className="flex items-center gap-1.5">
                            <Key className="w-3 h-3 text-gray-400" />
                            <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{mod.license_key}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {mod.activation_date ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(mod.activation_date).toLocaleDateString()}
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {mod.expiry_date ? (
                          <div className={`flex items-center gap-1 text-xs font-medium ${isExpired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(mod.expiry_date).toLocaleDateString()}
                            {isExpired && <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-xs">Expired</span>}
                            {expiringSoon && <span className="ml-1 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-xs">Soon</span>}
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {mod.renewal_date ? (
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(mod.renewal_date).toLocaleDateString()}
                          </div>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => handleToggleActive(mod)}
                            className={`p-1.5 rounded transition-colors ${mod.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={mod.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {mod.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => openEdit(mod)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(mod)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingModule ? 'Edit Module' : 'Add Module'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Organisation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Organisation <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.organization_id}
                    onChange={e => setForm(f => ({ ...f, organization_id: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    required
                    disabled={!!editingModule}
                  >
                    <option value="">Select organisation...</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Module Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Module Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {MODULE_KEYS.map(key => {
                    const meta = MODULE_META[key];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => !editingModule && handleModuleKeyChange(key)}
                        disabled={!!editingModule}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                          form.module_key === key
                            ? `${meta.border} ${meta.bg} ${meta.color}`
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        } ${editingModule ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.module_name}
                  onChange={e => setForm(f => ({ ...f, module_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Skills Management"
                  required
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enable to grant organisation access to this module</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* License Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  License Key <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.license_key}
                    onChange={e => setForm(f => ({ ...f, license_key: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                </div>
              </div>

              {/* Dates - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Activation Date</span>
                  </label>
                  <input
                    type="date"
                    value={form.activation_date}
                    onChange={e => setForm(f => ({ ...f, activation_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Expiry Date</span>
                  </label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Purchased Date</span>
                  </label>
                  <input
                    type="date"
                    value={form.purchased_date}
                    onChange={e => setForm(f => ({ ...f, purchased_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Renewal Date</span>
                  </label>
                  <input
                    type="date"
                    value={form.renewal_date}
                    onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving…' : editingModule ? 'Update Module' : 'Add Module'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
