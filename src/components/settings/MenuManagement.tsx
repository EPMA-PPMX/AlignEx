import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MenuRecord {
  id: number;
  menu_item: string;
  visibility: boolean;
  license_type: string;
  created_on: string | null;
  updated_on: string | null;
}

const emptyForm = { menu_item: '', visibility: true, license_type: '' };

const MenuManagement: React.FC = () => {
  const [records, setRecords] = useState<MenuRecord[]>([]);
  const [licenseTypes, setLicenseTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
    fetchLicenseTypes();
  }, []);

  const fetchLicenseTypes = async () => {
    const { data } = await supabase
      .from('typeoflicense')
      .select('licensetype')
      .order('licensetype', { ascending: true });
    if (data) setLicenseTypes(data.map((r) => r.licensetype));
  };

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_management')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (rec: MenuRecord) => {
    setEditingId(rec.id);
    setForm({ menu_item: rec.menu_item, visibility: rec.visibility, license_type: rec.license_type });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.menu_item.trim()) {
      setError('Menu item name is required.');
      return;
    }
    if (!form.license_type.trim()) {
      setError('License type is required.');
      return;
    }
    setSaving(true);
    setError(null);

    if (editingId !== null) {
      const { error } = await supabase
        .from('menu_management')
        .update({ menu_item: form.menu_item.trim(), visibility: form.visibility, license_type: form.license_type, updated_on: new Date().toISOString() })
        .eq('id', editingId);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from('menu_management')
        .insert({ menu_item: form.menu_item.trim(), visibility: form.visibility, license_type: form.license_type });
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    closeForm();
    fetchRecords();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this menu item?')) return;
    const { error } = await supabase.from('menu_management').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    fetchRecords();
  };

  const toggleVisibility = async (rec: MenuRecord) => {
    await supabase
      .from('menu_management')
      .update({ visibility: !rec.visibility, updated_on: new Date().toISOString() })
      .eq('id', rec.id);
    fetchRecords();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Menu Management</h2>
          <p className="text-sm text-gray-500 mt-1">Configure menu items, visibility, and license access.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Menu Item
        </button>
      </div>

      {error && !showForm && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="mb-6 p-5 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {editingId !== null ? 'Edit Menu Item' : 'Add Menu Item'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Menu Item Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.menu_item}
                onChange={(e) => setForm({ ...form, menu_item: e.target.value })}
                placeholder="e.g. Dashboard"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Type <span className="text-red-500">*</span></label>
              <select
                value={form.license_type}
                onChange={(e) => setForm({ ...form, license_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select license type...</option>
                {licenseTypes.map((lt) => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Visible</span>
              </label>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={closeForm}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-400 text-sm">No menu items yet. Click "Add Menu Item" to create one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Menu Item</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">License Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Visibility</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => (
                <tr key={rec.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{rec.menu_item}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {rec.license_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleVisibility(rec)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${rec.visibility ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rec.visibility ? 'translate-x-4' : 'translate-x-1'}`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {rec.created_on ? new Date(rec.created_on).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(rec)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
  );
};

export default MenuManagement;


