import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface SkillCategory {
  id: string;
  name: string;
  description: string;
  manager: string;
  created_at: string;
  updated_at: string;
}

export default function SkillCategoriesManagement() {
  const { showConfirm } = useNotification();
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    manager: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('skill_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      const { data, error } = await supabase.from('skill_categories').insert([
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
          manager: formData.manager.trim(),
        },
      ]).select();

      if (error) {
        console.error('Supabase error:', error);
        alert(`Failed to add category: ${error.message}`);
        return;
      }

      console.log('Category added successfully:', data);
      setFormData({ name: '', description: '', manager: '' });
      setShowAddForm(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error adding category:', error);
      alert(`Failed to add category: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const category = categories.find((c) => c.id === id);
      if (!category) return;

      const { error } = await supabase
        .from('skill_categories')
        .update({
          name: category.name,
          description: category.description,
          manager: category.manager,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Skill Category',
      message: 'Are you sure you want to delete this category? All associated skills will also be deleted.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('skill_categories').delete().eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const handleCategoryChange = (id: string, field: string, value: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, [field]: value } : cat))
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading skill categories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Skill Categories</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage skill categories and assign category managers
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {showAddForm && (
        <div className="bg-primary-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-4">New Skill Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Project Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manager</label>
              <input
                type="text"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Manager name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Brief description"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ name: '', description: '', manager: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">No skill categories yet. Click "Add Category" to create one.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Category Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Manager</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Description
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    {editingId === category.id ? (
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => handleCategoryChange(category.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{category.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === category.id ? (
                      <input
                        type="text"
                        value={category.manager}
                        onChange={(e) => handleCategoryChange(category.id, 'manager', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-slate-700">{category.manager || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === category.id ? (
                      <input
                        type="text"
                        value={category.description}
                        onChange={(e) =>
                          handleCategoryChange(category.id, 'description', e.target.value)
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-slate-600">{category.description || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === category.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(category.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              fetchCategories();
                            }}
                            className="p-1 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingId(category.id)}
                            className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
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
}
