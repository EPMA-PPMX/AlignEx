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
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedSkillForGoal, setSelectedSkillForGoal] = useState<SkillComparison | null>(null);

  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    goal_type: 'training' as const,
    target_date: '',
    status: 'not_started' as const,
    notes: ''
  });

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

  const openGoalModal = (comp: SkillComparison) => {
    const roleName = roles.find(r => r.id === selectedRole)?.name || 'role';
    setSelectedSkillForGoal(comp);
    setGoalForm({
      title: `Improve ${comp.skill.name} to ${comp.requiredLevel} level`,
      description: `Required for ${roleName} role. Current level: ${comp.currentLevel}, Required level: ${comp.requiredLevel}`,
      goal_type: 'training',
      target_date: '',
      status: 'not_started',
      notes: ''
    });
    setShowGoalModal(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSkillForGoal) return;

    try {
      const { error } = await supabase
        .from('skill_goals')
        .insert([{
          skill_id: selectedSkillForGoal.skill.id,
          title: goalForm.title,
          description: goalForm.description,
          goal_type: goalForm.goal_type,
          target_date: goalForm.target_date || null,
          status: goalForm.status,
          notes: goalForm.notes || null
        }]);

      if (error) throw error;

      alert('Goal added successfully! Check the "My Goals" tab to track your progress.');
      resetGoalForm();
    } catch (error: any) {
      console.error('Error adding goal:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetGoalForm = () => {
    setShowGoalModal(false);
    setSelectedSkillForGoal(null);
    setGoalForm({
      title: '',
      description: '',
      goal_type: 'training',
      target_date: '',
      status: 'not_started',
      notes: ''
    });
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
          <div className="flex items-center gap-1 text-primary-600">
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
        return <span className="text-gray-500 font-medium">N/A</span>;
      default:
        return null;
    }
  };

  if (loading && roles.length === 0) {
    return <div className="text-center py-12 text-gray-600">Loading roles...</div>;
  }

  if (roles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <p className="text-gray-600">
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
          <h2 className="text-xl font-semibold text-gray-900">Role Comparison</h2>
          <p className="text-sm text-gray-600 mt-1">
            Compare your skills against target role requirements
          </p>
        </div>
        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">No skill requirements configured for this role.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedComparisons)
            .sort()
            .map((categoryName) => (
              <div key={categoryName} className="bg-widget-bg border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{categoryName}</h3>
                <div className="space-y-4">
                  {groupedComparisons[categoryName].map((comp) => (
                    <div key={comp.skill.id}>
                      <div
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{comp.skill.name}</span>
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
                          <div className="text-sm text-gray-600">
                            <span className="text-blue-700">Required: {comp.requiredLevel}</span>
                            <span className="mx-2">•</span>
                            <span className="text-gray-700">Current: {comp.currentLevel}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {comp.status === 'gap' && (
                            <button
                              onClick={() => openGoalModal(comp)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Target className="w-4 h-4" />
                              Add to Goals
                            </button>
                          )}
                          <div>{getStatusBadge(comp.status)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {showGoalModal && selectedSkillForGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-widget-bg rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Create Skill Goal
              </h3>
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Skill
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedSkillForGoal.skill.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This skill will be automatically linked to your goal
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goal Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={goalForm.goal_type}
                      onChange={(e) => setGoalForm({ ...goalForm, goal_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="certification">Certification</option>
                      <option value="training">Training</option>
                      <option value="self_study">Self Study</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={goalForm.target_date}
                      onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={goalForm.status}
                    onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe what you want to achieve..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={goalForm.notes}
                    onChange={(e) => setGoalForm({ ...goalForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="E.g., Enroll in online course, find a mentor, practice on projects..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Goal
                  </button>
                  <button
                    type="button"
                    onClick={resetGoalForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
