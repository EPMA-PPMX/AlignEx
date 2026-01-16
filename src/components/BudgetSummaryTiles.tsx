import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface BudgetMetrics {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  burnRate: number;
}

interface BudgetSummaryTilesProps {
  metrics: BudgetMetrics;
  viewFilter: 'monthly' | 'yearly';
  selectedMonth?: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const BudgetSummaryTiles: React.FC<BudgetSummaryTilesProps> = ({
  metrics,
  viewFilter,
  selectedMonth = 0
}) => {
  const { totalBudget, totalSpent, remaining, burnRate } = metrics;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = remaining < 0;

  const getViewLabel = () => {
    if (viewFilter === 'monthly') {
      return MONTH_NAMES[selectedMonth];
    }
    return 'Year to Date';
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">
          Budget Overview - {getViewLabel()}
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isOverBudget ? 'bg-red-500' : spentPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600">{Math.round(spentPercentage)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Budget</span>
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalBudget)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {viewFilter === 'monthly' ? 'Forecasted for month' : 'Annual forecast'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Spent</span>
            <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`w-5 h-5 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(totalSpent)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {spentPercentage.toFixed(1)}% of budget used
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Remaining</span>
            <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-100' : 'bg-teal-100'}`}>
              <TrendingDown className={`w-5 h-5 ${isOverBudget ? 'text-red-600' : 'text-teal-600'}`} />
            </div>
          </div>
          <div className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(remaining))}
          </div>
          <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {isOverBudget ? 'Over budget!' : 'Available to spend'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Burn Rate</span>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(burnRate)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {viewFilter === 'monthly' ? 'Spent this month' : 'Average per month'}
          </p>
        </div>
      </div>
    </div>
  );
};
