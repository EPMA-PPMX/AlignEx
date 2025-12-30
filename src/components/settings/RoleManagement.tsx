import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../lib/useNotification';

interface Role {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface SkillCategory {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
}

interface RoleSkillRequirement {
  id: string;
  role_id: string;
  skill_id: string;
  required_level: string;
  skill: Skill;
}

const PROFICIENCY_LEVELS = ['None', 'Basic', 'Intermediate', 'Expert'];

export default function RoleManagement() {
  const { showConfirm } = useNotification();
  const [roles, setRoles] = useState<Role[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [requirements, setRequirements] = useState<Record<string, RoleSkillRequirement[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [managingSkillsFor, setManagingSkillsFor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchCategories(), fetchSkills()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase.from('roles').select('*').order('name');

    if (error) throw error;
    setRoles(data || []);

    for (const role of data || []) {
      await fetchRoleRequirements(role.id);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('skill_categories')
      .select('id, name')
      .order('name');

    if (error) throw error;
    setCategories(data || []);
    if (data && data.length > 0 && !selectedCategory) {
      setSelectedCategory(data[0].id);
    }
  };

  const fetchSkills = async () => {
    const { data, error } = await supabase.from('skills').select('*').order('name');

    if (error) throw error;
    setSkills(data || []);
  };

  const fetchRoleRequirements = async (roleId: string) => {
    const { data, error } = await supabase
      .from('role_skill_requirements')
      .select(
        `
        *,
        skill:skills(id, category_id, name)
      `
      )
      .eq('role_id', roleId);

    if (error) throw error;
    setRequirements((prev) => ({ ...prev, [roleId]: data || [] }));
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      const { error } = await supabase.from('roles').insert([
        {
          name: formData.name,
          description: formData.description,
        },
      ]);

      if (error) throw error;

      setFormData({ name: '', description: '' });
      setShowAddForm(false);
      fetchRoles();
    } catch (error) {
      console.error('Error adding role:', error);
      alert('Failed to add role');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const role = roles.find((r) => r.id === id);
      if (!role) return;

      const { error } = await supabase
        .from('roles')
        .update({
          name: role.name,
          description: role.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? All skill requirements for this role will also be deleted.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('roles').delete().eq('id', id);

      if (error) throw error;
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role');
    }
  };

  const handleRoleChange = (id: string, field: string, value: string) => {
    setRoles((prev) => prev.map((role) => (role.id === id ? { ...role, [field]: value } : role)));
  };

  const handleManageSkills = (roleId: string) => {
    setManagingSkillsFor(roleId);
    const currentRequirements = requirements[roleId] || [];
    const skillLevels: Record<string, string> = {};
    currentRequirements.forEach((req) => {
      skillLevels[req.skill_id] = req.required_level;
    });
    setSelectedSkills(skillLevels);
  };

  const handleSaveSkillRequirements = async () => {
    if (!managingSkillsFor) return;

    try {
      const { error: deleteError } = await supabase
        .from('role_skill_requirements')
        .delete()
        .eq('role_id', managingSkillsFor);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      const requirementsToInsert = Object.entries(selectedSkills)
        .filter(([_, level]) => level !== 'None')
        .map(([skillId, level]) => ({
          role_id: managingSkillsFor,
          skill_id: skillId,
          required_level: level,
        }));

      console.log('Requirements to insert:', requirementsToInsert);

      if (requirementsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_skill_requirements')
          .insert(requirementsToInsert);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
      }

      await fetchRoleRequirements(managingSkillsFor);
      setManagingSkillsFor(null);
      setSelectedSkills({});
    } catch (error: any) {
      console.error('Error saving skill requirements:', error);
      alert(`Failed to save skill requirements: ${error.message || 'Unknown error'}`);
    }
  };

  const filteredSkills = selectedCategory
    ? skills.filter((s) => s.category_id === selectedCategory)
    : skills;

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading roles...</div>;
  }

  if (managingSkillsFor) {
    const role = roles.find((r) => r.id === managingSkillsFor);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Manage Skills for {role?.name}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select the minimum proficiency level required for each skill
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSkillRequirements}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Requirements
            </button>
            <button
              onClick={() => {
                setManagingSkillsFor(null);
                setSelectedSkills({});
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700 mr-2">Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Skill</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Required Level
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSkills.map((skill) => {
                const category = categories.find((c) => c.id === skill.category_id);
                return (
                  <tr key={skill.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900">{skill.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600">{category?.name || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={selectedSkills[skill.id] || 'None'}
                        onChange={(e) =>
                          setSelectedSkills((prev) => ({ ...prev, [skill.id]: e.target.value }))
                        }
                        className="px-3 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {PROFICIENCY_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Role Management</h2>
          <p className="text-sm text-slate-600 mt-1">
            Define roles and their required skill levels
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Role
        </button>
      </div>

      {showAddForm && (
        <div className="bg-primary-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 mb-4">New Role</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., Project Manager"
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
                setFormData({ name: '', description: '' });
              }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {roles.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">No roles yet. Click "Add Role" to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {editingId === role.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={role.name}
                        onChange={(e) => handleRoleChange(role.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={role.description}
                        onChange={(e) => handleRoleChange(role.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-slate-900">{role.name}</h3>
                      {role.description && (
                        <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {editingId === role.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(role.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          fetchRoles();
                        }}
                        className="p-2 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleManageSkills(role.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                        title="Manage Skills"
                      >
                        <Users className="w-4 h-4" />
                        Manage Skills
                      </button>
                      <button
                        onClick={() => setEditingId(role.id)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(role.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {requirements[role.id] && requirements[role.id].length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Required Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {requirements[role.id].map((req) => (
                      <span
                        key={req.id}
                        className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
                      >
                        {req.skill.name} - {req.required_level}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
