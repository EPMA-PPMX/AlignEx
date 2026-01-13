import { useState, useEffect } from 'react';
import { Plus, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RequiresModule from './RequiresModule';
import { useNotification } from '../lib/useNotification';

interface Priority {
  id: string;
  title: string;
  target_value: string;
}

interface PriorityImpact {
  id: string;
  priority_id: string;
  planned_impact: string;
  priority?: Priority;
}

interface MonthlyBenefit {
  id: string;
  project_id: string;
  priority_id: string;
  month_year: string;
  estimated_benefit_value: number;
  actual_benefit_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface BenefitTrackingProps {
  projectId: string;
}

export default function BenefitTracking({ projectId }: BenefitTrackingProps) {
  const { showConfirm } = useNotification();
  const [priorityImpacts, setPriorityImpacts] = useState<PriorityImpact[]>([]);
  const [monthlyBenefits, setMonthlyBenefits] = useState<MonthlyBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [notes, setNotes] = useState('');
  const [editingBenefit, setEditingBenefit] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: impacts, error: impactsError } = await supabase
        .from('project_priority_impacts')
        .select(`
          id,
          priority_id,
          planned_impact,
          organizational_priorities:priority_id (
            id,
            title,
            target_value
          )
        `)
        .eq('project_id', projectId);

      if (impactsError) throw impactsError;

      const formattedImpacts = (impacts || []).map((impact: any) => ({
        id: impact.id,
        priority_id: impact.priority_id,
        planned_impact: impact.planned_impact,
        priority: impact.organizational_priorities
      }));

      setPriorityImpacts(formattedImpacts);

      const { data: benefits, error: benefitsError } = await supabase
        .from('monthly_benefit_tracking')
        .select('*')
        .eq('project_id', projectId)
        .order('month_year', { ascending: false });

      if (benefitsError) throw benefitsError;
      setMonthlyBenefits(benefits || []);
    } catch (error) {
      console.error('Error loading benefit tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPriority || !selectedMonth || !actualValue) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const priorityImpact = priorityImpacts.find(p => p.priority_id === selectedPriority);
      const estimatedValue = priorityImpact?.planned_impact ? parseFloat(priorityImpact.planned_impact.replace(/[^0-9.-]+/g, '')) : 0;

      const monthYearDate = `${selectedMonth}-01`;

      if (editingBenefit) {
        const { error } = await supabase
          .from('monthly_benefit_tracking')
          .update({
            actual_benefit_value: parseFloat(actualValue),
            notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBenefit);

        if (error) throw error;
        alert('Benefit tracking updated successfully!');
      } else {
        const { error } = await supabase
          .from('monthly_benefit_tracking')
          .insert([{
            project_id: projectId,
            priority_id: selectedPriority,
            month_year: monthYearDate,
            estimated_benefit_value: estimatedValue,
            actual_benefit_value: parseFloat(actualValue),
            notes: notes || null
          }]);

        if (error) throw error;
        alert('Benefit tracking added successfully!');
      }

      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving benefit tracking:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (benefit: MonthlyBenefit) => {
    setEditingBenefit(benefit.id);
    setSelectedPriority(benefit.priority_id);
    setSelectedMonth(benefit.month_year.substring(0, 7));
    setActualValue(benefit.actual_benefit_value?.toString() || '');
    setNotes(benefit.notes || '');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Benefit Tracking Entry',
      message: 'Are you sure you want to delete this benefit tracking entry?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('monthly_benefit_tracking')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Benefit tracking deleted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting benefit tracking:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingBenefit(null);
    setSelectedPriority('');
    setSelectedMonth('');
    setActualValue('');
    setNotes('');
  };

  const getPriorityName = (priorityId: string) => {
    const impact = priorityImpacts.find(p => p.priority_id === priorityId);
    return impact?.priority?.title || 'Unknown Priority';
  };

  const getEstimatedValue = (priorityId: string) => {
    const impact = priorityImpacts.find(p => p.priority_id === priorityId);
    return impact?.planned_impact || 'N/A';
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMonthYear = (dateString: string) => {
    const [year, month] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const calculateTotalBenefits = () => {
    const estimated = priorityImpacts.reduce((sum, impact) => {
      const value = parseFloat(impact.planned_impact.replace(/[^0-9.-]+/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    const actual = monthlyBenefits.reduce((sum, benefit) => {
      return sum + (benefit.actual_benefit_value || 0);
    }, 0);

    return { estimated, actual };
  };

  const totals = calculateTotalBenefits();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (priorityImpacts.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start">
          <TrendingUp className="w-6 h-6 text-yellow-600 mt-1 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Priority Impacts Defined</h3>
            <p className="text-yellow-800">
              This project does not have any organizational priority impacts defined.
              Priority impacts are typically set during the project initiation phase.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RequiresModule moduleKey="benefits">
      <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Total Estimated Benefits</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totals.estimated)}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-900">Total Actual Benefits</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.actual)}</p>
        </div>

        <div className={`rounded-lg p-4 border ${
          totals.actual >= totals.estimated
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              totals.actual >= totals.estimated ? 'text-green-900' : 'text-orange-900'
            }`}>
              Achievement Rate
            </span>
            <TrendingUp className={`w-5 h-5 ${
              totals.actual >= totals.estimated ? 'text-green-600' : 'text-orange-600'
            }`} />
          </div>
          <p className={`text-2xl font-bold ${
            totals.actual >= totals.estimated ? 'text-green-900' : 'text-orange-900'
          }`}>
            {totals.estimated > 0 ? Math.round((totals.actual / totals.estimated) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Estimated Benefits (Read-Only)</h3>
        </div>

        <div className="space-y-3">
          {priorityImpacts.map((impact) => (
            <div key={impact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h4 className="font-medium text-gray-900">{impact.priority?.title}</h4>
                <p className="text-sm text-gray-600">Target: {impact.priority?.target_value}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{impact.planned_impact}</p>
                <p className="text-xs text-gray-500">Estimated Impact</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-widget-bg rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Monthly Benefit Tracking</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-gradient-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            {showAddForm ? 'Cancel' : 'Add Monthly Benefit'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority *
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingBenefit}
                >
                  <option value="">Select a priority</option>
                  {priorityImpacts.map((impact) => (
                    <option key={impact.priority_id} value={impact.priority_id}>
                      {impact.priority?.title} - Est: {impact.planned_impact}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month & Year *
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!!editingBenefit}
                    min="2020-01"
                    max="2030-12"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Click the calendar icon and use arrow buttons to change year</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Benefit Value ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={actualValue}
                  onChange={(e) => setActualValue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter dollar amount"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingBenefit ? 'Update' : 'Add'} Benefit Tracking
              </button>
              {editingBenefit && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {monthlyBenefits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No monthly benefit tracking entries yet.</p>
            <p className="text-sm">Add your first entry to start tracking actual benefits.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Month/Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Estimated Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actual Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyBenefits.map((benefit) => (
                  <tr key={benefit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatMonthYear(benefit.month_year)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPriorityName(benefit.priority_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatCurrency(benefit.estimated_benefit_value)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(benefit.actual_benefit_value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {benefit.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(benefit)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(benefit.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </RequiresModule>
  );
}
