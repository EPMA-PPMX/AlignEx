import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Star, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description: string;
}

interface SkillCategory {
  id: string;
  name: string;
  description: string;
}

interface RoleSkillRequirement {
  id: string;
  role_id: string;
  skill_id: string;
  required_level: string;
}

interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: string;
}

interface SkillComparison {
  skill: Skill;
  categoryName: string;
  requiredLevel: string;
  currentLevel: string;
  status: 'match' | 'exceeds' | 'gap' | 'na';
  priority: 'required' | 'preferred' | 'optional';
}

const PROFICIENCY_ORDER = ['None', 'Basic', 'Intermediate', 'Expert'];
const USER_ID = 'current-user';

export default function RoleComparisonTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [comparisons, setComparisons] = useState<SkillComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGoalForSkill, setAddingGoalForSkill] = useState<string | null>(null);
  const [goalNotes, setGoalNotes] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchComparison();
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('roles').select('*').order('name');

      if (error) throw error;

      setRoles(data || []);
      if (data && data.length > 0) {
        setSelectedRole(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      setLoading(true);

      const [reqResult, userSkillsResult, skillsResult, categoriesResult] = await Promise.all([
        supabase.from('role_skill_requirements').select('*').eq('role_id', selectedRole),
        supabase.from('user_skills').select('*').eq('user_id', USER_ID),
        supabase.from('skills').select('*'),
        supabase.from('skill_categories').select('*'),
      ]);

      if (reqResult.error) throw reqResult.error;
      if (userSkillsResult.error) throw userSkillsResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      const requirements = reqResult.data || [];
      const userSkills = userSkillsResult.data || [];
      const skills = skillsResult.data || [];
      const categories = categoriesResult.data || [];

      const userSkillMap: Record<string, string> = {};
      userSkills.forEach((us) => {
        userSkillMap[us.skill_id] = us.proficiency_level;
      });

      const categoryMap: Record<string, string> = {};
      categories.forEach((cat) => {
        categoryMap[cat.id] = cat.name;
      });

      const comparisonsData: SkillComparison[] = requirements.map((req) => {
        const skill = skills.find((s) => s.id === req.skill_id);
        if (!skill) return null;

        const currentLevel = userSkillMap[req.skill_id] || 'None';
        const requiredLevel = req.required_level;

        const currentIndex = PROFICIENCY_ORDER.indexOf(currentLevel);
        const requiredIndex = PROFICIENCY_ORDER.indexOf(requiredLevel);

        let status: 'match' | 'exceeds' | 'gap' | 'na';
        if (currentLevel === 'None' && requiredLevel === 'None') {
          status = 'na';
        } else if (currentIndex === requiredIndex) {
          status = 'match';
        } else if (currentIndex > requiredIndex) {
          status = 'exceeds';
        } else {
          status = 'gap';
        }

        return {
          skill,
          categoryName: categoryMap[skill.category_id] || 'Unknown',
          requiredLevel,
          currentLevel,
          status,
          priority: 'required',
        };
      }).filter(Boolean) as SkillComparison[];

      const groupedByCategory: Record<string, SkillComparison[]> = {};
      comparisonsData.forEach((comp) => {
        if (!groupedByCategory[comp.categoryName]) {
          groupedByCategory[comp.categoryName] = [];
        }
        groupedByCategory[comp.categoryName].push(comp);
      });

      const sortedComparisons: SkillComparison[] = [];
      Object.keys(groupedByCategory)
        .sort()
        .forEach((catName) => {
          sortedComparisons.push(...groupedByCategory[catName]);
        });

      setComparisons(sortedComparisons);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGoals = async (comp: SkillComparison) => {
    try {
      const roleName = roles.find(r => r.id === selectedRole)?.name || 'role';
      const goalTitle = `Improve ${comp.skill.name} to ${comp.requiredLevel} level`;

      const { error } = await supabase
        .from('skill_goals')
        .insert([{
          skill_id: comp.skill.id,
          title: goalTitle,
          description: `Required for ${roleName} role. Current level: ${comp.currentLevel}, Required level: ${comp.requiredLevel}`,
          goal_type: 'training',
          status: 'not_started',
          notes: goalNotes || null
        }]);

      if (error) throw error;

      alert('Goal added successfully! Check the "My Goals" tab to track your progress.');
      setAddingGoalForSkill(null);
      setGoalNotes('');
    } catch (error: any) {
      console.error('Error adding goal:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'match':
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Match</span>
          </div>
        );
      case 'exceeds':
        return (
          <div className="flex items-center gap-1 text-blue-600">
            <Star className="w-5 h-5" />
            <span className="font-medium">Exceeds</span>
          </div>
        );
      case 'gap':
        return (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Gap</span>
          </div>
        );
      case 'na':
        return <span className="text-slate-500 font-medium">N/A</span>;
      default:
        return null;
    }
  };

  if (loading && roles.length === 0) {
    return <div className="text-center py-12 text-slate-600">Loading roles...</div>;
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-600">
          No roles configured yet. Please add roles in the Settings page.
        </p>
      </div>
    );
  }

  const groupedComparisons: Record<string, SkillComparison[]> = {};
  comparisons.forEach((comp) => {
    if (!groupedComparisons[comp.categoryName]) {
      groupedComparisons[comp.categoryName] = [];
    }
    groupedComparisons[comp.categoryName].push(comp);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Role Comparison</h2>
          <p className="text-sm text-slate-600 mt-1">
            Compare your skills against target role requirements
          </p>
        </div>
        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {comparisons.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-600">No skill requirements configured for this role.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedComparisons)
            .sort()
            .map((categoryName) => (
              <div key={categoryName} className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">{categoryName}</h3>
                <div className="space-y-4">
                  {groupedComparisons[categoryName].map((comp) => (
                    <div key={comp.skill.id}>
                      <div
                        className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900">{comp.skill.name}</span>
                            {comp.priority === 'required' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                                required
                              </span>
                            )}
                            {comp.priority === 'preferred' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                                preferred
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">
                            <span className="text-blue-700">Required: {comp.requiredLevel}</span>
                            <span className="mx-2">•</span>
                            <span className="text-slate-700">Current: {comp.currentLevel}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {comp.status === 'gap' && (
                            <button
                              onClick={() => setAddingGoalForSkill(comp.skill.id)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Target className="w-4 h-4" />
                              Add to Goals
                            </button>
                          )}
                          <div>{getStatusBadge(comp.status)}</div>
                        </div>
                      </div>

                      {addingGoalForSkill === comp.skill.id && (
                        <div className="ml-6 mt-3 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-semibold text-slate-900 mb-2">Add to Goals</h4>
                          <p className="text-sm text-slate-600 mb-3">
                            Create a goal to improve your {comp.skill.name} skills from {comp.currentLevel} to {comp.requiredLevel}
                          </p>
                          <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Notes (optional)
                            </label>
                            <textarea
                              value={goalNotes}
                              onChange={(e) => setGoalNotes(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="E.g., Enroll in online course, find a mentor, practice on projects..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddToGoals(comp)}
                              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Create Goal
                            </button>
                            <button
                              onClick={() => {
                                setAddingGoalForSkill(null);
                                setGoalNotes('');
                              }}
                              className="px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
