import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MonthlyBudgetGrid } from '../MonthlyBudgetGrid';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

interface BudgetForecast {
  id: string;
  project_id: string;
  category: string;
  month_year: string;
  forecasted_amount: number;
  actual_amount: number | null;
}

export default function StepBudget({ reportData, updateReportData }: Props) {
  const [forecasts, setForecasts] = useState<BudgetForecast[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportData.projectId) {
      loadBudgetForecasts();
    }
  }, [reportData.projectId, selectedYear]);

  const loadBudgetForecasts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_forecast_monthly')
        .select('*')
        .eq('project_id', reportData.projectId)
        .gte('month_year', `${selectedYear}-01-01`)
        .lte('month_year', `${selectedYear}-12-31`)
        .order('month_year');

      if (error) throw error;
      setForecasts(data || []);
    } catch (error) {
      console.error('Error loading budget forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateValue = async (id: string, field: 'forecasted_amount' | 'actual_amount', value: number) => {
    try {
      const { error } = await supabase
        .from('budget_forecast_monthly')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setForecasts(forecasts.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      ));
    } catch (error) {
      console.error('Error updating budget:', error);
      alert('Failed to update budget. Please try again.');
    }
  };

  const availableYears = () => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Budget Forecast</h2>
          <p className="text-gray-600">Update monthly budget forecast and actual amounts</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableYears().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Loading budget data...</p>
        </div>
      ) : forecasts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No budget forecast data found for this project</p>
          <p className="text-sm text-gray-500 mt-2">Budget forecasts need to be set up in the project details page first</p>
        </div>
      ) : (
        <MonthlyBudgetGrid
          forecasts={forecasts}
          selectedYear={selectedYear}
          onUpdateValue={handleUpdateValue}
        />
      )}
    </div>
  );
}
