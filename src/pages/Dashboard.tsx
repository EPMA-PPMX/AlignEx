import React from 'react';
import { Users, Clock, CheckCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import RecentActivity from '../components/RecentActivity';
import ProjectOverview from '../components/ProjectOverview';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Projects',
      value: '24',
      icon: Users,
      change: '+12%',
      changeType: 'positive' as const,
      color: 'blue',
    },
    {
      title: 'Active Projects',
      value: '18',
      icon: Clock,
      change: '+5%',
      changeType: 'positive' as const,
      color: 'emerald',
    },
    {
      title: 'Completed',
      value: '6',
      icon: CheckCircle,
      change: '+25%',
      changeType: 'positive' as const,
      color: 'green',
    },
    {
      title: 'At Risk',
      value: '3',
      icon: AlertCircle,
      change: '-8%',
      changeType: 'negative' as const,
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
        {stats.map((stat, index) => (
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