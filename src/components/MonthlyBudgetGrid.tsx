import React from 'react';
import { formatCurrency } from '../lib/utils';

interface MonthlyBudgetForecast {
  id: string;
  project_id: string;
  category: string;
  year: number;
  january_forecast: number;
  january_actual: number;
  february_forecast: number;
  february_actual: number;
  march_forecast: number;
  march_actual: number;
  april_forecast: number;
  april_actual: number;
  may_forecast: number;
  may_actual: number;
  june_forecast: number;
  june_actual: number;
  july_forecast: number;
  july_actual: number;
  august_forecast: number;
  august_actual: number;
  september_forecast: number;
  september_actual: number;
  october_forecast: number;
  october_actual: number;
  november_forecast: number;
  november_actual: number;
  december_forecast: number;
  december_actual: number;
  created_at: string;
  updated_at: string;
}

interface MonthlyBudgetGridProps {
  forecasts: MonthlyBudgetForecast[];
  onUpdateValue: (forecastId: string, month: string, type: 'forecast' | 'actual', value: string) => void;
  calculateVariance: (forecast: number, actual: number) => { percentage: number; color: string };
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MonthlyBudgetGrid: React.FC<MonthlyBudgetGridProps> = ({
  forecasts,
  onUpdateValue,
  calculateVariance
}) => {
  if (forecasts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No budget categories selected. Add budget categories above to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[150px]">
                Category
              </th>
              <th className="px-2 py-3 text-center text-xs font-medium text-gray-600 border-r border-gray-200 min-w-[60px]">
                Type
              </th>
              {MONTH_LABELS.map((label, index) => (
                <th
                  key={index}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-900 border-r border-gray-200 min-w-[100px]"
                >
                  {label}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[100px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((forecast) => {
              const forecastTotal = MONTHS.reduce((sum, month) => sum + (forecast[`${month}_forecast` as keyof MonthlyBudgetForecast] as number || 0), 0);
              const actualTotal = MONTHS.reduce((sum, month) => sum + (forecast[`${month}_actual` as keyof MonthlyBudgetForecast] as number || 0), 0);
              const totalVariance = calculateVariance(forecastTotal, actualTotal);

              return (
                <React.Fragment key={forecast.id}>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td
                      rowSpan={3}
                      className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 align-top"
                    >
                      <div className="flex items-center h-full">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {forecast.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-primary-50">
                      Forecast
                    </td>
                    {MONTHS.map((month) => {
                      const value = forecast[`${month}_forecast` as keyof MonthlyBudgetForecast] as number || 0;
                      return (
                        <td key={`${month}-forecast`} className="px-2 py-2 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={value || ''}
                            onChange={(e) => onUpdateValue(forecast.id, month, 'forecast', e.target.value)}
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                      {formatCurrency(forecastTotal)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-green-50">
                      Actual
                    </td>
                    {MONTHS.map((month) => {
                      const value = forecast[`${month}_actual` as keyof MonthlyBudgetForecast] as number || 0;
                      return (
                        <td key={`${month}-actual`} className="px-2 py-2 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={value || ''}
                            onChange={(e) => onUpdateValue(forecast.id, month, 'actual', e.target.value)}
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                      {formatCurrency(actualTotal)}
                    </td>
                  </tr>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <td className="px-2 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-200">
                      Variance
                    </td>
                    {MONTHS.map((month) => {
                      const forecastValue = forecast[`${month}_forecast` as keyof MonthlyBudgetForecast] as number || 0;
                      const actualValue = forecast[`${month}_actual` as keyof MonthlyBudgetForecast] as number || 0;
                      const variance = calculateVariance(forecastValue, actualValue);
                      return (
                        <td key={`${month}-variance`} className="px-2 py-2 text-xs font-medium text-center border-r border-gray-200">
                          <span className={variance.color}>
                            {variance.percentage > 0 ? '+' : ''}{variance.percentage}%
                          </span>
                        </td>
                      );
                    })}
                    <td className={`px-4 py-2 text-sm font-bold text-right ${totalVariance.color}`}>
                      {totalVariance.percentage > 0 ? '+' : ''}{totalVariance.percentage}%
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
