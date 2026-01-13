import React, { useState, useEffect } from 'react';
import { User, Target, Trophy } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MySkillsTab from '../components/skills/MySkillsTab';
import RoleComparisonTab from '../components/skills/RoleComparisonTab';
import MyGoalsTab from '../components/skills/MyGoalsTab';
import RequiresModule from '../components/RequiresModule';

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

const USER_ID = 'current-user';

type TabType = 'my-skills' | 'role-comparison' | 'my-goals';

export default function Skills() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'my-skills');
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, UserSkill>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tabParam && ['my-skills', 'role-comparison', 'my-goals'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [categoriesResult, skillsResult, userSkillsResult] = await Promise.all([
        supabase.from('skill_categories').select('*').order('name'),
        supabase.from('skills').select('*').order('name'),
        supabase.from('user_skills').select('*').eq('user_id', USER_ID),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (userSkillsResult.error) throw userSkillsResult.error;

      setCategories(categoriesResult.data || []);
      setAllSkills(skillsResult.data || []);

      const skillsMap: Record<string, UserSkill> = {};
      (userSkillsResult.data || []).forEach((us) => {
        skillsMap[us.skill_id] = us;
      });
      setUserSkills(skillsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading skills...</div>;
  }

  return (
    <RequiresModule moduleKey="skills">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Skills</h1>
          <p className="text-gray-600">Rate your proficiency in each skill area</p>
        </div>

        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('my-skills')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'my-skills'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-5 h-5" />
              My Skills
            </button>
            <button
              onClick={() => setActiveTab('role-comparison')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'role-comparison'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-5 h-5" />
              Role Comparison
            </button>
            <button
              onClick={() => setActiveTab('my-goals')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'my-goals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Trophy className="w-5 h-5" />
              My Goals
            </button>
          </div>
        </div>

        <div className="mt-6">
          {activeTab === 'my-skills' && (
            <MySkillsTab
              categories={categories}
              allSkills={allSkills}
              userSkills={userSkills}
              onRefresh={fetchData}
            />
          )}
          {activeTab === 'role-comparison' && <RoleComparisonTab />}
          {activeTab === 'my-goals' && <MyGoalsTab />}
        </div>
      </div>
    </RequiresModule>
  );
}
