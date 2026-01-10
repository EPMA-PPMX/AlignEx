import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change: string;
  changeType: 'positive' | 'negative';
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, change, changeType, color }) => {
  const colorClasses = {
    blue: 'bg-primary-500',
    emerald: 'bg-emerald-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
  };

  return (
    <div className="bg-gradient-card backdrop-blur-sm p-6 rounded-lg shadow-lg border border-primary-400/30 hover:shadow-xl transition-all hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-purple-200">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <div className="flex items-center mt-2">
            {changeType === 'positive' ? (
              <TrendingUp className="w-4 h-4 text-cyan-400 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
            )}
            <span className={`text-sm ${changeType === 'positive' ? 'text-cyan-300' : 'text-red-300'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]} shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;