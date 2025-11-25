import { useState, useEffect } from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface TimesheetSummary {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  daysLogged: number;
}

export default function TimesheetQuickWidget() {
  const [summary, setSummary] = useState<TimesheetSummary>({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    daysLogged: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThisWeekHours();
  }, []);

  const fetchThisWeekHours = async () => {
    try {
      setLoading(true);

      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('hours, is_billable, entry_date')
        .eq('user_id', DEMO_USER_ID)
        .gte('entry_date', startOfWeek.toISOString().split('T')[0])
        .lte('entry_date', endOfWeek.toISOString().split('T')[0]);

      if (error) throw error;

      const entries = data || [];
      const uniqueDates = new Set(entries.map(e => e.entry_date));

      const totals = entries.reduce((acc, entry) => {
        acc.totalHours += entry.hours;
        if (entry.is_billable) {
          acc.billableHours += entry.hours;
        } else {
          acc.nonBillableHours += entry.hours;
        }
        return acc;
      }, { totalHours: 0, billableHours: 0, nonBillableHours: 0 });

      setSummary({
        ...totals,
        daysLogged: uniqueDates.size
      });
    } catch (err) {
      console.error('Error fetching timesheet:', err);
    } finally {
      setLoading(false);
    }
  };

  const billablePercentage = summary.totalHours > 0
    ? Math.round((summary.billableHours / summary.totalHours) * 100)
    : 0;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            This Week
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          This Week
        </h3>
        <Link
          to="/timesheet"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {summary.totalHours.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">hours logged</div>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Billable</span>
              <span className="text-sm font-semibold text-blue-600">
                {summary.billableHours.toFixed(1)}h
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${billablePercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Non-Billable</span>
              <span className="text-sm font-semibold text-gray-700">
                {summary.nonBillableHours.toFixed(1)}h
              </span>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Days Logged</span>
              <span className="text-sm font-semibold text-gray-900">
                {summary.daysLogged} / 7
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link
          to="/timesheet"
          className="block w-full text-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Log Hours
        </Link>
      </div>
    </div>
  );
}
