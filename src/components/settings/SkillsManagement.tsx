import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Award, TrendingUp, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface SkillCategory {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description: string;
  is_core: boolean;
  is_certifiable: boolean;
  is_in_demand: boolean;
  created_at: string;
  updated_at: string;
}

export default function SkillsManagement() {
  const { showConfirm } = useNotification();
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_core: false,
    is_certifiable: false,
    is_in_demand: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSkills();
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      if (data && data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('category_id', selectedCategory)
        .order('name');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Skill name is required');
      return;
    }

    if (!selectedCategory) {
      alert('Please select a category first');
      return;
    }

    try {
      const { error } = await supabase.from('skills').insert([
        {
          category_id: selectedCategory,
          name: formData.name,
          description: formData.description,
          is_core: formData.is_core,
          is_certifiable: formData.is_certifiable,
          is_in_demand: formData.is_in_demand,
        },
      ]);

      if (error) throw error;

      setFormData({
        name: '',
        description: '',
        is_core: false,
        is_certifiable: false,
        is_in_demand: false,
      });
      setShowAddForm(false);
      fetchSkills();
    } catch (error) {
      console.error('Error adding skill:', error);
      alert('Failed to add skill');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const skill = skills.find((s) => s.id === id);
      if (!skill) return;

      const { error } = await supabase
        .from('skills')
        .update({
          name: skill.name,
          description: skill.description,
          is_core: skill.is_core,
          is_certifiable: skill.is_certifiable,
          is_in_demand: skill.is_in_demand,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      fetchSkills();
    } catch (error) {
      console.error('Error updating skill:', error);
      alert('Failed to update skill');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Skill',
      message: 'Are you sure you want to delete this skill? All user ratings for this skill will also be deleted.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('skills').delete().eq('id', id);

      if (error) throw error;
      fetchSkills();
    } catch (error) {
      console.error('Error deleting skill:', error);
      alert('Failed to delete skill');
    }
  };

  const handleSkillChange = (id: string, field: string, value: string | boolean) => {
    setSkills((prev) =>
      prev.map((skill) => (skill.id === id ? { ...skill, [field]: value } : skill))
    );
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-600">Please create skill categories first before adding skills.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Skills Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage skills within each category and set their attributes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-4">New Skill</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Resource Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_core}
                onChange={(e) => setFormData({ ...formData, is_core: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-slate-700">Core Skill</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_certifiable}
                onChange={(e) => setFormData({ ...formData, is_certifiable: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">Certifiable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_in_demand}
                onChange={(e) => setFormData({ ...formData, is_in_demand: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-700">In Demand</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({
                  name: '',
                  description: '',
                  is_core: false,
                  is_certifiable: false,
                  is_in_demand: false,
                });
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading skills...</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">No skills in this category yet. Click "Add Skill" to create one.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Skill Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Attributes</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    {editingId === skill.id ? (
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => handleSkillChange(skill.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{skill.name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === skill.id ? (
                      <input
                        type="text"
                        value={skill.description}
                        onChange={(e) => handleSkillChange(skill.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <span className="text-slate-600">{skill.description || '-'}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingId === skill.id ? (
                      <div className="flex items-center justify-center gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skill.is_core}
                            onChange={(e) => handleSkillChange(skill.id, 'is_core', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                          />
                          <Star className="w-4 h-4 text-amber-500" />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skill.is_certifiable}
                            onChange={(e) => handleSkillChange(skill.id, 'is_certifiable', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                          />
                          <Award className="w-4 h-4 text-blue-500" />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skill.is_in_demand}
                            onChange={(e) => handleSkillChange(skill.id, 'is_in_demand', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                          />
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {skill.is_core && <Star className="w-4 h-4 text-amber-500" title="Core Skill" />}
                        {skill.is_certifiable && <Award className="w-4 h-4 text-blue-500" title="Certifiable" />}
                        {skill.is_in_demand && <TrendingUp className="w-4 h-4 text-green-500" title="In Demand" />}
                        {!skill.is_core && !skill.is_certifiable && !skill.is_in_demand && (
                          <span className="text-slate-400">-</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === skill.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(skill.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              fetchSkills();
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
                            onClick={() => setEditingId(skill.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(skill.id)}
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
