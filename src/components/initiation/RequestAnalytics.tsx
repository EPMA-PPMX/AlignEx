import React from 'react';
import { Clock, DollarSign, TrendingUp, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

interface ProjectRequest {
  id: string;
  status: string;
  initial_estimated_cost: number | null;
  estimated_duration: number | null;
}

interface RequestAnalyticsProps {
  requests: ProjectRequest[];
}

export default function RequestAnalytics({ requests }: RequestAnalyticsProps) {
  const statusColors: { [key: string]: { bg: string; text: string; icon: any } } = {
    'Draft': { bg: 'bg-slate-100', text: 'text-slate-700', icon: FileText },
    'Pending Approval': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    'Approved': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    'Rejected': { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    'More Information Needed': { bg: 'bg-blue-100', text: 'text-blue-700', icon: AlertCircle },
  };

  const statusDistribution = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const totalCost = requests.reduce((sum, req) => sum + (req.initial_estimated_cost || 0), 0);
  const avgCost = requests.length > 0 ? totalCost / requests.length : 0;
  const requestsWithCost = requests.filter(r => r.initial_estimated_cost).length;

  const totalDuration = requests.reduce((sum, req) => sum + (req.estimated_duration || 0), 0);
  const avgDuration = requests.length > 0 ? totalDuration / requests.length : 0;
  const requestsWithDuration = requests.filter(r => r.estimated_duration).length;

  const getStatusChartData = () => {
    const total = requests.length;
    let currentAngle = 0;

    return Object.entries(statusDistribution).map(([status, count]) => {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        status,
        count,
        percentage,
        startAngle,
        angle,
        color: statusColors[status]
      };
    });
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", x, y,
      "Z"
    ].join(" ");
  };

  const chartData = getStatusChartData();

  const getDurationDistribution = () => {
    const ranges = [
      { label: '0-3 months', min: 0, max: 3 },
      { label: '4-6 months', min: 4, max: 6 },
      { label: '7-12 months', min: 7, max: 12 },
      { label: '12+ months', min: 13, max: Infinity },
    ];

    return ranges.map(range => ({
      ...range,
      count: requests.filter(r =>
        r.estimated_duration &&
        r.estimated_duration >= range.min &&
        r.estimated_duration <= range.max
      ).length
    }));
  };

  const getCostDistribution = () => {
    const ranges = [
      { label: '$0-100k', min: 0, max: 100000 },
      { label: '$100k-250k', min: 100000, max: 250000 },
      { label: '$250k-500k', min: 250000, max: 500000 },
      { label: '$500k+', min: 500000, max: Infinity },
    ];

    return ranges.map(range => ({
      ...range,
      count: requests.filter(r =>
        r.initial_estimated_cost &&
        r.initial_estimated_cost >= range.min &&
        r.initial_estimated_cost < range.max
      ).length
    }));
  };

  const durationData = getDurationDistribution();
  const costData = getCostDistribution();
  const maxDurationCount = Math.max(...durationData.map(d => d.count), 1);
  const maxCostCount = Math.max(...costData.map(d => d.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Status Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Status Distribution</h3>

        <div className="flex items-center justify-center mb-6">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {chartData.map((item, index) => {
              const colors: { [key: string]: string } = {
                'Draft': '#64748b',
                'Pending Approval': '#f59e0b',
                'Approved': '#10b981',
                'Rejected': '#ef4444',
                'More Information Needed': '#3b82f6',
              };

              return (
                <path
                  key={index}
                  d={describeArc(100, 100, 80, item.startAngle, item.startAngle + item.angle)}
                  fill={colors[item.status]}
                  opacity="0.9"
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                />
              );
            })}
            <circle cx="100" cy="100" r="50" fill="white" />
            <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold" fill="#1f2937">
              {requests.length}
            </text>
            <text x="100" y="115" textAnchor="middle" className="text-xs" fill="#6b7280">
              Total
            </text>
          </svg>
        </div>

        <div className="space-y-2">
          {Object.entries(statusDistribution).map(([status, count]) => {
            const StatusIcon = statusColors[status]?.icon || FileText;
            return (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusColors[status]?.text || 'text-gray-600'}`} />
                  <span className="text-sm text-gray-700">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                  <span className="text-xs text-gray-500">
                    ({((count / requests.length) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cost Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Analysis</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Total Cost</span>
            </div>
            <p className="text-xl font-bold text-blue-900">
              ${(totalCost / 1000).toFixed(0)}k
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Avg Cost</span>
            </div>
            <p className="text-xl font-bold text-green-900">
              ${(avgCost / 1000).toFixed(0)}k
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Cost Distribution</p>
          {costData.map((range, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">{range.label}</span>
                <span className="text-xs font-semibold text-gray-900">{range.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(range.count / maxCostCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {requestsWithCost} of {requests.length} requests have cost estimates
        </p>
      </div>

      {/* Duration Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Duration Analysis</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">Total Duration</span>
            </div>
            <p className="text-xl font-bold text-purple-900">
              {totalDuration} <span className="text-sm">mo</span>
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">Avg Duration</span>
            </div>
            <p className="text-xl font-bold text-orange-900">
              {avgDuration.toFixed(1)} <span className="text-sm">mo</span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Duration Distribution</p>
          {durationData.map((range, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700">{range.label}</span>
                <span className="text-xs font-semibold text-gray-900">{range.count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${(range.count / maxDurationCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {requestsWithDuration} of {requests.length} requests have duration estimates
        </p>
      </div>
    </div>
  );
}
