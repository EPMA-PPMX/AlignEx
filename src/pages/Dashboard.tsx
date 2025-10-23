import React, { useEffect, useState } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import ProjectOverview from '../components/ProjectOverview';
import { supabase } from '../lib/supabase';

interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  atRisk: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectStats>({
    total: 0,
    active: 0,
    completed: 0,
    atRisk: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectStats();
  }, []);

  const fetchProjectStats = async () => {
    try {
      setLoading(true);

      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, status');

      if (error) {
        console.error('Error fetching project stats:', error);
        return;
      }

      if (projects) {
        const total = projects.length;
        const active = projects.filter(p =>
          p.status === 'In-Progress' || p.status === 'Active' || p.status === 'Planning'
        ).length;
        const completed = projects.filter(p =>
          p.status === 'Completed' || p.status === 'Closed'
        ).length;
        const atRisk = projects.filter(p =>
          p.status === 'At Risk' || p.status === 'Delayed' || p.status === 'On Hold'
        ).length;

        setStats({ total, active, completed, atRisk });
      }
    } catch (error) {
      console.error('Error fetching project stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Projects',
      value: loading ? '-' : stats.total.toString(),
      icon: Users,
      change: '',
      changeType: 'positive' as const,
      color: 'blue',
    },
    {
      title: 'Active Projects',
      value: loading ? '-' : stats.active.toString(),
      icon: Clock,
      change: '',
      changeType: 'positive' as const,
      color: 'emerald',
    },
    {
      title: 'Completed',
      value: loading ? '-' : stats.completed.toString(),
      icon: CheckCircle,
      change: '',
      changeType: 'positive' as const,
      color: 'green',
    },
    {
      title: 'At Risk',
      value: loading ? '-' : stats.atRisk.toString(),
      icon: AlertCircle,
      change: '',
      changeType: stats.atRisk > 0 ? 'negative' as const : 'positive' as const,
      color: 'red',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's an overview of your projects.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ProjectOverview />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;