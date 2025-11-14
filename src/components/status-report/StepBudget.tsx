import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepBudget({ reportData, updateReportData }: Props) {
  const [budgetItems, setBudgetItems] = useState<any[]>([]);

  useEffect(() => {
    if (reportData.projectId && reportData.budget.length === 0) {
      loadBudgetData();
    } else if (reportData.budget.length > 0) {
      setBudgetItems(reportData.budget);
    }
  }, [reportData.projectId]);

  const loadBudgetData = async () => {
    try {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', reportData.projectId);

      if (error) throw error;

      const items = (data || []).map((item: any) => ({
        category: item.category,
        planned_amount: item.planned_amount || 0,
        actual_amount: item.actual_amount || 0,
        forecast_amount: item.forecast_amount || 0,
        variance: ((item.forecast_amount || 0) - (item.planned_amount || 0)),
        notes: '',
      }));

      setBudgetItems(items);
      updateReportData('budget', items);
    } catch (error) {
      console.error('Error loading budget:', error);
    }
  };

  const handleUpdate = (index: number, field: string, value: any) => {
    const newItems = [...budgetItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'forecast_amount' || field === 'planned_amount') {
      newItems[index].variance = (newItems[index].forecast_amount || 0) - (newItems[index].planned_amount || 0);
    }
    setBudgetItems(newItems);
    updateReportData('budget', newItems);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Budget Forecast</h2>
        <p className="text-gray-600">Update budget forecast for this week</p>
      </div>

      {budgetItems.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No budget data found for this project</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Planned</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actual</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Forecast</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Variance</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {budgetItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    ${(item.planned_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <input
                      type="number"
                      value={item.actual_amount}
                      onChange={(e) => handleUpdate(index, 'actual_amount', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right border border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <input
                      type="number"
                      value={item.forecast_amount}
                      onChange={(e) => handleUpdate(index, 'forecast_amount', parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right border border-gray-300 rounded"
                    />
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                    item.variance > 0 ? 'text-red-600' : item.variance < 0 ? 'text-green-600' : 'text-gray-700'
                  }`}>
                    ${Math.abs(item.variance || 0).toLocaleString()}
                    {item.variance !== 0 && (item.variance > 0 ? ' over' : ' under')}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => handleUpdate(index, 'notes', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Add notes..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
