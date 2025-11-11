import React, { useState } from 'react';
import { formatCurrency } from '../lib/utils';

interface BudgetForecastMonthly {
  id: string;
  project_id: string;
  category: string;
  month_year: string;
  forecasted_amount: number;
  actual_amount: number | null;
}

interface MonthlyBudgetGridProps {
  forecasts: BudgetForecastMonthly[];
  selectedYear: number;
  onUpdateValue: (id: string, field: 'forecasted_amount' | 'actual_amount', value: number) => void;
}

type ViewMode = 'month' | 'quarter' | 'year';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

export const MonthlyBudgetGrid: React.FC<MonthlyBudgetGridProps> = ({
  forecasts,
  selectedYear,
  onUpdateValue
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  if (forecasts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No budget categories selected. Add budget categories above to get started.</p>
      </div>
    );
  }

  const groupByCategory = () => {
    const grouped: { [key: string]: BudgetForecastMonthly[] } = {};
    forecasts.forEach(forecast => {
      if (!grouped[forecast.category]) {
        grouped[forecast.category] = [];
      }
      grouped[forecast.category].push(forecast);
    });
    return grouped;
  };

  const getMonthIndex = (monthYear: string) => {
    const date = new Date(monthYear);
    return date.getMonth();
  };

  const getQuarter = (monthIndex: number) => {
    return Math.floor(monthIndex / 3);
  };

  const aggregateByQuarter = (categoryData: BudgetForecastMonthly[]) => {
    const quarters = [
      { forecast: 0, actual: 0, records: [] as BudgetForecastMonthly[] },
      { forecast: 0, actual: 0, records: [] as BudgetForecastMonthly[] },
      { forecast: 0, actual: 0, records: [] as BudgetForecastMonthly[] },
      { forecast: 0, actual: 0, records: [] as BudgetForecastMonthly[] }
    ];

    categoryData.forEach(record => {
      const monthIndex = getMonthIndex(record.month_year);
      const quarter = getQuarter(monthIndex);
      quarters[quarter].forecast += record.forecasted_amount || 0;
      quarters[quarter].actual += record.actual_amount || 0;
      quarters[quarter].records.push(record);
    });

    return quarters;
  };

  const aggregateByYear = (categoryData: BudgetForecastMonthly[]) => {
    const yearData = { forecast: 0, actual: 0, records: [] as BudgetForecastMonthly[] };
    categoryData.forEach(record => {
      yearData.forecast += record.forecasted_amount || 0;
      yearData.actual += record.actual_amount || 0;
      yearData.records.push(record);
    });
    return yearData;
  };

  const calculateVariance = (forecast: number, actual: number) => {
    if (forecast === 0) return { percentage: 0, color: 'text-gray-600' };
    const variance = ((actual - forecast) / forecast) * 100;
    const color = variance > 10 ? 'text-red-600' : variance < -10 ? 'text-green-600' : 'text-gray-600';
    return { percentage: Math.round(variance), color };
  };

  const handleCellClick = (id: string, field: string) => {
    setEditingCell({ id, field });
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const handleCellChange = (id: string, field: 'forecasted_amount' | 'actual_amount', value: string) => {
    const numValue = parseFloat(value) || 0;
    onUpdateValue(id, field, numValue);
  };

  const renderMonthView = () => {
    const categoryData = groupByCategory();

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
              {Object.entries(categoryData).map(([category, records]) => {
                const sortedRecords = records.sort((a, b) =>
                  new Date(a.month_year).getTime() - new Date(b.month_year).getTime()
                );

                const forecastTotal = sortedRecords.reduce((sum, r) => sum + (r.forecasted_amount || 0), 0);
                const actualTotal = sortedRecords.reduce((sum, r) => sum + (r.actual_amount || 0), 0);
                const totalVariance = calculateVariance(forecastTotal, actualTotal);

                return (
                  <React.Fragment key={category}>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td
                        rowSpan={3}
                        className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 align-top"
                      >
                        <div className="flex items-center h-full">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {category}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-blue-50">
                        Forecast
                      </td>
                      {sortedRecords.map((record) => (
                        <td key={`${record.id}-forecast`} className="px-2 py-2 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={record.forecasted_amount || ''}
                            onChange={(e) => handleCellChange(record.id, 'forecasted_amount', e.target.value)}
                            onFocus={() => handleCellClick(record.id, 'forecasted_amount')}
                            onBlur={handleCellBlur}
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(forecastTotal)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-green-50">
                        Actual
                      </td>
                      {sortedRecords.map((record) => (
                        <td key={`${record.id}-actual`} className="px-2 py-2 border-r border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={record.actual_amount || ''}
                            onChange={(e) => handleCellChange(record.id, 'actual_amount', e.target.value)}
                            onFocus={() => handleCellClick(record.id, 'actual_amount')}
                            onBlur={handleCellBlur}
                            className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(actualTotal)}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <td className="px-2 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-200">
                        Variance
                      </td>
                      {sortedRecords.map((record) => {
                        const variance = calculateVariance(record.forecasted_amount || 0, record.actual_amount || 0);
                        return (
                          <td key={`${record.id}-variance`} className="px-2 py-2 text-xs font-medium text-center border-r border-gray-200">
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

  const renderQuarterView = () => {
    const categoryData = groupByCategory();

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
                {QUARTER_LABELS.map((label, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[120px]"
                  >
                    {label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[120px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryData).map(([category, records]) => {
                const quarters = aggregateByQuarter(records);
                const forecastTotal = quarters.reduce((sum, q) => sum + q.forecast, 0);
                const actualTotal = quarters.reduce((sum, q) => sum + q.actual, 0);
                const totalVariance = calculateVariance(forecastTotal, actualTotal);

                return (
                  <React.Fragment key={category}>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td
                        rowSpan={3}
                        className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-900 border-r border-gray-200 align-top"
                      >
                        <div className="flex items-center h-full">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {category}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-blue-50">
                        Forecast
                      </td>
                      {quarters.map((quarter, index) => (
                        <td key={`q${index}-forecast`} className="px-4 py-2 text-sm text-right border-r border-gray-200">
                          {formatCurrency(quarter.forecast)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(forecastTotal)}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 text-xs text-gray-600 text-center border-r border-gray-200 bg-green-50">
                        Actual
                      </td>
                      {quarters.map((quarter, index) => (
                        <td key={`q${index}-actual`} className="px-4 py-2 text-sm text-right border-r border-gray-200">
                          {formatCurrency(quarter.actual)}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-sm font-semibold text-right text-gray-900">
                        {formatCurrency(actualTotal)}
                      </td>
                    </tr>
                    <tr className="border-b-2 border-gray-300 bg-gray-50">
                      <td className="px-2 py-2 text-xs font-medium text-gray-700 text-center border-r border-gray-200">
                        Variance
                      </td>
                      {quarters.map((quarter, index) => {
                        const variance = calculateVariance(quarter.forecast, quarter.actual);
                        return (
                          <td key={`q${index}-variance`} className="px-4 py-2 text-sm font-medium text-center border-r border-gray-200">
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

  const renderYearView = () => {
    const categoryData = groupByCategory();

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[200px]">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[150px]">
                  Forecasted
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[150px]">
                  Actual
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[150px]">
                  Variance
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryData).map(([category, records]) => {
                const yearData = aggregateByYear(records);
                const variance = calculateVariance(yearData.forecast, yearData.actual);

                return (
                  <tr key={category} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-r border-gray-200">
                      {formatCurrency(yearData.forecast)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right border-r border-gray-200">
                      {formatCurrency(yearData.actual)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-center ${variance.color}`}>
                      {variance.percentage > 0 ? '+' : ''}{variance.percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Budget Forecast</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setViewMode('quarter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'quarter' && renderQuarterView()}
      {viewMode === 'year' && renderYearView()}
    </div>
  );
};
