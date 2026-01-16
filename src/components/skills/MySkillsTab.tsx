import React, { useState } from 'react';
import { Award, TrendingUp, Save, Calendar, ChevronRight, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SkillCategory {
  id: string;
  name: string;
  description: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description: string;
  is_core: boolean;
  is_certifiable: boolean;
  is_in_demand: boolean;
}

interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: string;
  years_of_experience: number;
  certification_name: string;
  certification_date: string | null;
  certification_expiry: string | null;
  comments: string;
}

const PROFICIENCY_LEVELS = ['None', 'Basic', 'Intermediate', 'Expert'];
const USER_ID = 'current-user';

interface MySkillsTabProps {
  categories: SkillCategory[];
  allSkills: Skill[];
  userSkills: Record<string, UserSkill>;
  onRefresh: () => void;
}

export default function MySkillsTab({ categories, allSkills, userSkills, onRefresh }: MySkillsTabProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSkill, setEditingSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localUserSkills, setLocalUserSkills] = useState(userSkills);

  const handleSaveSkill = async (skillId: string) => {
    try {
      setSaving(true);

      const userSkill = localUserSkills[skillId];
      if (!userSkill) return;

      const dataToSave = {
        user_id: USER_ID,
        skill_id: skillId,
        proficiency_level: userSkill.proficiency_level,
        years_of_experience: userSkill.years_of_experience || 0,
        certification_name: userSkill.certification_name || '',
        certification_date: userSkill.certification_date || null,
        certification_expiry: userSkill.certification_expiry || null,
        comments: userSkill.comments || '',
        updated_at: new Date().toISOString(),
      };

      if (userSkill.id) {
        const { error } = await supabase
          .from('user_skills')
          .update(dataToSave)
          .eq('id', userSkill.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_skills').insert([dataToSave]);

        if (error) throw error;
      }

      setEditingSkill(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving user skill:', error);
      alert('Failed to save skill rating');
    } finally {
      setSaving(false);
    }
  };

  const handleSkillChange = (skillId: string, field: string, value: any) => {
    setLocalUserSkills((prev) => ({
      ...prev,
      [skillId]: {
        ...(prev[skillId] || {
          id: '',
          user_id: USER_ID,
          skill_id: skillId,
          proficiency_level: 'None',
          years_of_experience: 0,
          certification_name: '',
          certification_date: null,
          certification_expiry: null,
          comments: '',
        }),
        [field]: value,
      },
    }));
  };

  const getUserSkillValue = (skillId: string, field: string, defaultValue: any = '') => {
    return localUserSkills[skillId]?.[field as keyof UserSkill] || defaultValue;
  };

  const getSkillsForCategory = (categoryId: string) => {
    return allSkills.filter((s) => s.category_id === categoryId);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query) ||
      getSkillsForCategory(cat.id).some((skill) => skill.name.toLowerCase().includes(query))
    );
  });

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <Award className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        <p className="text-slate-600">
          No skill categories available yet. Please contact your administrator to set up skill categories.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search skills..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const skills = getSkillsForCategory(category.id);
          const isExpanded = expandedCategory === category.id;

          return (
            <div
              key={category.id}
              className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">{category.name}</h2>
                  <p className="text-sm text-primary-600">{category.description}</p>
                </div>
                <ChevronRight
                  className={`w-6 h-6 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50">
                  {skills.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slate-500">
                      No skills in this category yet
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {skills.map((skill) => {
                        const isEditing = editingSkill === skill.id;
                        const proficiencyLevel = getUserSkillValue(skill.id, 'proficiency_level', 'None');

                        return (
                          <div key={skill.id} className="px-6 py-5 bg-white">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-medium text-slate-900">{skill.name}</h3>
                                  {skill.is_core && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                      Core
                                    </span>
                                  )}
                                  {skill.is_certifiable && (
                                    <Award className="w-4 h-4 text-blue-500" title="Certifiable" />
                                  )}
                                  {skill.is_in_demand && (
                                    <TrendingUp className="w-4 h-4 text-green-500" title="In Demand" />
                                  )}
                                </div>
                                {skill.description && (
                                  <p className="text-sm text-slate-600">{skill.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Proficiency Level
                                </label>
                                <select
                                  value={proficiencyLevel}
                                  onChange={(e) => {
                                    handleSkillChange(skill.id, 'proficiency_level', e.target.value);
                                    setEditingSkill(skill.id);
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                    proficiencyLevel === 'Expert'
                                      ? 'border-green-500 bg-green-50'
                                      : proficiencyLevel === 'Intermediate'
                                      ? 'border-primary-500 bg-primary-50'
                                      : proficiencyLevel === 'Basic'
                                      ? 'border-amber-500 bg-amber-50'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {PROFICIENCY_LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                      {level}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                  Years of Experience
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={getUserSkillValue(skill.id, 'years_of_experience', 0)}
                                  onChange={(e) => {
                                    handleSkillChange(
                                      skill.id,
                                      'years_of_experience',
                                      parseFloat(e.target.value)
                                    );
                                    setEditingSkill(skill.id);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  placeholder="0.0"
                                />
                              </div>

                              {skill.is_certifiable && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                      Certification Name
                                    </label>
                                    <input
                                      type="text"
                                      value={getUserSkillValue(skill.id, 'certification_name', '')}
                                      onChange={(e) => {
                                        handleSkillChange(skill.id, 'certification_name', e.target.value);
                                        setEditingSkill(skill.id);
                                      }}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      placeholder="e.g., PMP, AWS Certified"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <Calendar className="w-3 h-3 inline mr-1" />
                                        Cert. Date
                                      </label>
                                      <input
                                        type="date"
                                        value={getUserSkillValue(skill.id, 'certification_date', '')}
                                        onChange={(e) => {
                                          handleSkillChange(skill.id, 'certification_date', e.target.value);
                                          setEditingSkill(skill.id);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-2">
                                        <Calendar className="w-3 h-3 inline mr-1" />
                                        Expiry
                                      </label>
                                      <input
                                        type="date"
                                        value={getUserSkillValue(skill.id, 'certification_expiry', '')}
                                        onChange={(e) => {
                                          handleSkillChange(skill.id, 'certification_expiry', e.target.value);
                                          setEditingSkill(skill.id);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>
                                  </div>
                                </>
                              )}

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Comments</label>
                                <textarea
                                  rows={2}
                                  value={getUserSkillValue(skill.id, 'comments', '')}
                                  onChange={(e) => {
                                    handleSkillChange(skill.id, 'comments', e.target.value);
                                    setEditingSkill(skill.id);
                                  }}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  placeholder="Additional notes about your experience with this skill..."
                                />
                              </div>
                            </div>

                            {isEditing && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => handleSaveSkill(skill.id)}
                                  disabled={saving}
                                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                                >
                                  <Save className="w-4 h-4" />
                                  {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-600">No categories match your search</p>
        </div>
      )}
    </div>
  );
}
