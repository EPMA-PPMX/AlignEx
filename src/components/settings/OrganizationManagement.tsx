import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Check, X, Globe, Mail,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Shield, TrendingUp, Zap, Key, Calendar, Package
} from 'lucide-react';
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

interface OrgModule {
  id: string;
  organization_id: string;
  module_key: 'base' | 'skills' | 'benefits';
  module_name: string;
  is_active: boolean;
  license_key: string | null;
  activation_date: string | null;
  expiry_date: string | null;
}

const MODULE_DEFS = [
  { key: 'base', name: 'Base Platform', icon: Shield, description: 'Core project management features. Always active.' },
  { key: 'skills', name: 'Skills Management', icon: TrendingUp, description: 'Track and manage team skills and competencies.' },
  { key: 'benefits', name: 'Benefit Realization', icon: Zap, description: 'Monitor and report on project benefit outcomes.' },
] as const;

const emptyOrgForm = { name: '', domain: '', billing_email: '' };

export default function OrganizationManagement() {
  const { showConfirm, showNotification } = useNotification();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modules, setModules] = useState<OrgModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  // Org form
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgForm, setOrgForm] = useState(emptyOrgForm);
  const [savingOrg, setSavingOrg] = useState(false);

  // Module activation form
  const [editingModule, setEditingModule] = useState<{ orgId: string; moduleKey: string } | null>(null);
  const [moduleForm, setModuleForm] = useState({ license_key: '', expiry_date: '' });
  const [savingModule, setSavingModule] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgsResult, modulesResult] = await Promise.all([
        supabase.from('organizations').select('*').order('name'),
        supabase.from('organization_modules').select('*').order('module_key'),
      ]);
      if (orgsResult.error) throw orgsResult.error;
      if (modulesResult.error) throw modulesResult.error;
      setOrganizations(orgsResult.data || []);
      setModules(modulesResult.data || []);
    } catch (error: any) {
      showNotification('Failed to load organisations', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Organisation CRUD ────────────────────────────────────────────────────────

  const openAddOrg = () => {
    setOrgForm(emptyOrgForm);
    setEditingOrg(null);
    setShowOrgModal(true);
  };

  const openEditOrg = (org: Organization) => {
    setOrgForm({ name: org.name, domain: org.domain || '', billing_email: org.billing_email || '' });
    setEditingOrg(org);
    setShowOrgModal(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgForm.name.trim()) { showNotification('Organisation name is required', 'error'); return; }
    setSavingOrg(true);
    try {
      const payload = {
        name: orgForm.name.trim(),
        domain: orgForm.domain.trim() || null,
        billing_email: orgForm.billing_email.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingOrg) {
        const { error } = await supabase.from('organizations').update(payload).eq('id', editingOrg.id);
        if (error) throw error;
        showNotification('Organisation updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('organizations')
          .insert([{ ...payload, is_active: true }])
          .select('id')
          .single();
        if (error) throw error;
        // Seed default modules for new org
        if (data?.id) {
          await supabase.from('organization_modules').insert(
            MODULE_DEFS.map(m => ({
              organization_id: data.id,
              module_key: m.key,
              module_name: m.name,
              is_active: m.key === 'base',
            }))
          );
        }
        showNotification('Organisation added', 'success');
      }

      setShowOrgModal(false);
      setEditingOrg(null);
      setOrgForm(emptyOrgForm);
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleToggleOrgActive = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ is_active: !org.is_active, updated_at: new Date().toISOString() })
        .eq('id', org.id);
      if (error) throw error;
      showNotification(`Organisation ${!org.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  const handleDeleteOrg = async (org: Organization) => {
    const confirmed = await showConfirm({
      title: 'Delete Organisation',
      message: `Delete "${org.name}"? This will also remove all associated modules and may affect user licenses.`,
      confirmText: 'Delete',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', org.id);
      if (error) throw error;
      showNotification('Organisation deleted', 'success');
      if (expandedOrg === org.id) setExpandedOrg(null);
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
  };

  // ── Module management ────────────────────────────────────────────────────────

  const getOrgModules = (orgId: string) => modules.filter(m => m.organization_id === orgId);

  const getModule = (orgId: string, moduleKey: string) =>
    modules.find(m => m.organization_id === orgId && m.module_key === moduleKey);

  const openModuleEdit = (orgId: string, moduleKey: string, mod: OrgModule | undefined) => {
    setEditingModule({ orgId, moduleKey });
    setModuleForm({
      license_key: mod?.license_key || '',
      expiry_date: mod?.expiry_date || '',
    });
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule) return;
    setSavingModule(true);
    const { orgId, moduleKey } = editingModule;
    const existing = getModule(orgId, moduleKey);
    const def = MODULE_DEFS.find(d => d.key === moduleKey)!;

    try {
      if (existing) {
        const { error } = await supabase.from('organization_modules').update({
          is_active: true,
          license_key: moduleForm.license_key.trim() || null,
          activation_date: new Date().toISOString().split('T')[0],
          expiry_date: moduleForm.expiry_date || null,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('organization_modules').insert([{
          organization_id: orgId,
          module_key: moduleKey,
          module_name: def.name,
          is_active: true,
          license_key: moduleForm.license_key.trim() || null,
          activation_date: new Date().toISOString().split('T')[0],
          expiry_date: moduleForm.expiry_date || null,
        }]);
        if (error) throw error;
      }
      showNotification('Module activated', 'success');
      setEditingModule(null);
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSavingModule(false);
    }
  };

  const handleDeactivateModule = async (mod: OrgModule) => {
    if (mod.module_key === 'base') return;
    const confirmed = await showConfirm({
      title: 'Deactivate Module',
      message: `Deactivate "${mod.module_name}" for this organisation? Users will lose access.`,
      confirmText: 'Deactivate',
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('organization_modules').update({
        is_active: false,
        updated_at: new Date().toISOString(),
      }).eq('id', mod.id);
      if (error) throw error;
      showNotification('Module deactivated', 'success');
      loadData();
    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    }
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
        <p className="text-gray-600">Manage organisations and their module subscriptions.</p>
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

      {/* Organisations list */}
      <div className="bg-widget-bg rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Organisations</h3>
          <button
            onClick={openAddOrg}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Organisation
          </button>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No organisations yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {organizations.map((org) => {
              const isExpanded = expandedOrg === org.id;
              const orgMods = getOrgModules(org.id);

              return (
                <div key={org.id}>
                  {/* Organisation row */}
                  <div className={`flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors ${!org.is_active ? 'opacity-60' : ''}`}>
                    <button
                      onClick={() => setExpandedOrg(isExpanded ? null : org.id)}
                      className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>

                    <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{org.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {orgMods.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {orgMods.filter(m => m.is_active).length}/{orgMods.length} modules active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        {org.domain && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Globe className="w-3 h-3" />{org.domain}
                          </span>
                        )}
                        {org.billing_email && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="w-3 h-3" />{org.billing_email}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Created {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEditOrg(org)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleOrgActive(org)} className={`p-1.5 rounded ${org.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={org.is_active ? 'Deactivate' : 'Activate'}>
                        {org.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteOrg(org)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded modules panel */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="w-4 h-4 text-gray-500" />
                        <h4 className="text-sm font-semibold text-gray-700">Module Subscriptions</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {MODULE_DEFS.map((def) => {
                          const mod = getModule(org.id, def.key);
                          const isBase = def.key === 'base';
                          const isActive = mod?.is_active ?? false;
                          const Icon = def.icon;
                          const isEditing = editingModule?.orgId === org.id && editingModule?.moduleKey === def.key;

                          return (
                            <div
                              key={def.key}
                              className={`rounded-xl border-2 p-4 transition-colors ${
                                isActive ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-100'
                              }`}
                            >
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`p-2 rounded-lg flex-shrink-0 ${isActive ? 'bg-green-100' : 'bg-gray-200'}`}>
                                  <Icon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm">{def.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{def.description}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                  {isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>

                              {/* Module details */}
                              {mod?.activation_date && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                  <Calendar className="w-3 h-3" />
                                  Activated: {new Date(mod.activation_date).toLocaleDateString()}
                                </div>
                              )}
                              {mod?.expiry_date && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                  <Calendar className="w-3 h-3" />
                                  Expires: {new Date(mod.expiry_date).toLocaleDateString()}
                                </div>
                              )}
                              {mod?.license_key && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                                  <Key className="w-3 h-3" />
                                  <span className="font-mono">{mod.license_key}</span>
                                </div>
                              )}

                              {/* Inline activation form */}
                              {isEditing && (
                                <form onSubmit={handleSaveModule} className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">License Key (optional)</label>
                                    <input
                                      type="text"
                                      value={moduleForm.license_key}
                                      onChange={e => setModuleForm(f => ({ ...f, license_key: e.target.value }))}
                                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                      placeholder="XXXX-XXXX-XXXX"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date (optional)</label>
                                    <input
                                      type="date"
                                      value={moduleForm.expiry_date}
                                      onChange={e => setModuleForm(f => ({ ...f, expiry_date: e.target.value }))}
                                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button type="submit" disabled={savingModule} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 disabled:opacity-50">
                                      <Check className="w-3 h-3" />
                                      {savingModule ? 'Saving…' : 'Activate'}
                                    </button>
                                    <button type="button" onClick={() => setEditingModule(null)} className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </form>
                              )}

                              {/* Action buttons */}
                              {!isEditing && (
                                <div className="mt-3">
                                  {isBase ? (
                                    <p className="text-xs text-gray-400 italic">Always active — included with all licenses.</p>
                                  ) : isActive ? (
                                    <button
                                      onClick={() => mod && handleDeactivateModule(mod)}
                                      className="w-full px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-100 transition-colors font-medium"
                                    >
                                      Deactivate Module
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openModuleEdit(org.id, def.key, mod)}
                                      className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium"
                                    >
                                      Activate Module
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Organisation Modal */}
      {showOrgModal && (
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
              <button onClick={() => setShowOrgModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrg} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm(f => ({ ...f, name: e.target.value }))}
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
                    value={orgForm.domain}
                    onChange={(e) => setOrgForm(f => ({ ...f, domain: e.target.value }))}
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
                    value={orgForm.billing_email}
                    onChange={(e) => setOrgForm(f => ({ ...f, billing_email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="billing@acme.com"
                  />
                </div>
              </div>

              {!editingOrg && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Default modules (Base, Skills, Benefits) will be provisioned automatically. You can activate them after saving.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingOrg}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {savingOrg ? 'Saving…' : editingOrg ? 'Update Organisation' : 'Add Organisation'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOrgModal(false); setEditingOrg(null); setOrgForm(emptyOrgForm); }}
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


export default OrganizationManagement