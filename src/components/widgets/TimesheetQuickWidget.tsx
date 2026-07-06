import { useState, useEffect } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";

interface TimesheetSummary {
  totalHours: string;
  billableHours: string;
  nonBillableHours: string;
  billableMinutes: number;
  daysLogged: number;
}

export default function TimesheetQuickWidget() {
  const [summary, setSummary] = useState<TimesheetSummary>({
    totalHours: "00.00",
    billableHours: "00.00",
    nonBillableHours: "00.00",
    billableMinutes: 0,
    daysLogged: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThisWeekHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeToMinutes = (time: string): number => {
    if (!time) return 0;

    const [hours = 0, minutes = 0] = time.toString().split(".").map(Number);

    return hours * 60 + minutes;
  };

  const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}.${String(minutes).padStart(
      2,
      "0",
    )}`;
  };

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
        .from("timesheet_entries")
        .select("hours, is_billable, entry_date")
        .gte("entry_date", startOfWeek.toISOString().split("T")[0])
        .lte("entry_date", endOfWeek.toISOString().split("T")[0]);

      if (error) throw error;

      const entries = data || [];

      const uniqueDates = new Set(entries.map((e: any) => e.entry_date));

      const totals = entries.reduce(
        (acc: any, entry: any) => {
          const minutes = timeToMinutes(entry.hours);

          acc.totalMinutes += minutes;

          if (entry.is_billable) {
            acc.billableMinutes += minutes;
          } else {
            acc.nonBillableMinutes += minutes;
          }

          return acc;
        },
        {
          totalMinutes: 0,
          billableMinutes: 0,
          nonBillableMinutes: 0,
        },
      );

      setSummary({
        totalHours: minutesToTime(totals.totalMinutes),
        billableHours: minutesToTime(totals.billableMinutes),
        nonBillableHours: minutesToTime(totals.nonBillableMinutes),
        billableMinutes: totals.billableMinutes,
        daysLogged: uniqueDates.size,
      });
    } catch (err) {
      console.error("Error fetching timesheet:", err);
    } finally {
      setLoading(false);
    }
  };

  const TARGET_BILLABLE_MINUTES = 40 * 60;

  const billablePercentage = Math.min(
    Math.round((summary.billableMinutes / TARGET_BILLABLE_MINUTES) * 100),
    100,
  );

  const isOverTarget = summary.billableMinutes > TARGET_BILLABLE_MINUTES;

  if (loading) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full">
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
    <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#5B2C91]" />
          This Week
        </h3>

        <Link
          to="/timesheet"
          className="text-sm text-[#5B2C91] hover:text-[#4a2377]"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1">
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {summary.totalHours}
          </div>
          <div className="text-sm text-gray-600">hours logged</div>
        </div>

        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Billable</span>

              <span
                className={`text-sm font-semibold ${
                  isOverTarget ? "text-red-600" : "text-[#5B2C91]"
                }`}
              >
                {summary.billableHours}h / 40h
              </span>
            </div>

            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isOverTarget
                    ? "bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A]"
                    : "bg-gradient-dark"
                }`}
                style={{
                  width: `${billablePercentage}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Non-Billable</span>

              <span className="text-sm font-semibold text-gray-700">
                {summary.nonBillableHours}h
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
          className="block w-full text-center py-2 px-4 bg-gradient-dark hover:opacity-90 text-white rounded-lg transition-opacity text-sm font-medium"
        >
          Log Hours
        </Link>
      </div>
    </div>
  );
}
