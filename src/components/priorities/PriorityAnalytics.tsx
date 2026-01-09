import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle, TrendingUp, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Priority {
  id: string;
  title: string;
  target_value: string;
  status: string;
  owner: string;
}

interface ProjectImpact {
  priority_id: string;
  planned_impact: string;
  actual_impact: string | null;
}

interface AnalyticsData {
  priority: Priority;
  totalProjects: number;
  reportedProjects: number;
  unreportedProjects: number;
  completionRate: number;
  insights: string[];
  recommendations: string[];
}

export default function PriorityAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data: priorities, error: prioritiesError } = await supabase
        .from('organizational_priorities')
        .select('*')
        .eq('status', 'Active')
        .order('title');

      if (prioritiesError) throw prioritiesError;

      const { data: impacts, error: impactsError } = await supabase
        .from('project_priority_impacts')
        .select('*');

      if (impactsError) throw impactsError;

      const analyticsData = (priorities || []).map((priority) => {
        const priorityImpacts = (impacts || []).filter(
          (impact: ProjectImpact) => impact.priority_id === priority.id
        );

        const totalProjects = priorityImpacts.length;
        const reportedProjects = priorityImpacts.filter(
          (impact: ProjectImpact) => impact.actual_impact
        ).length;
        const unreportedProjects = totalProjects - reportedProjects;
        const completionRate = totalProjects > 0 ? (reportedProjects / totalProjects) * 100 : 0;

        const insights = generateInsights(priority, priorityImpacts, reportedProjects, totalProjects);
        const recommendations = generateRecommendations(
          priority,
          priorityImpacts,
          reportedProjects,
          totalProjects,
          completionRate
        );

        return {
          priority,
          totalProjects,
          reportedProjects,
          unreportedProjects,
          completionRate,
          insights,
          recommendations,
        };
      });

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (
    priority: Priority,
    impacts: ProjectImpact[],
    reported: number,
    total: number
  ): string[] => {
    const insights: string[] = [];

    if (total === 0) {
      insights.push('No projects are currently aligned with this priority. Consider identifying potential projects.');
    } else if (total < 3) {
      insights.push(`Only ${total} ${total === 1 ? 'project is' : 'projects are'} contributing to this priority. Consider expanding coverage.`);
    } else {
      insights.push(`${total} projects are actively contributing to this priority.`);
    }

    if (reported === 0 && total > 0) {
      insights.push('No actual impact has been reported yet. Encourage project teams to provide updates.');
    } else if (reported > 0 && reported < total) {
      insights.push(`${reported} of ${total} projects have reported actual impact. ${total - reported} ${total - reported === 1 ? 'project needs' : 'projects need'} updates.`);
    } else if (reported === total && total > 0) {
      insights.push('All projects have reported their actual impact. Great visibility!');
    }

    const hasActualData = impacts.some((impact) => impact.actual_impact);
    if (hasActualData) {
      insights.push('Impact data is being tracked. Monitor variance between planned and actual regularly.');
    }

    return insights;
  };

  const generateRecommendations = (
    priority: Priority,
    impacts: ProjectImpact[],
    reported: number,
    total: number,
    completionRate: number
  ): string[] => {
    const recommendations: string[] = [];

    if (total === 0) {
      recommendations.push('Identify and align existing or new projects with this strategic priority.');
      recommendations.push('Conduct a portfolio review to find projects that could contribute to this goal.');
      recommendations.push('Consider creating dedicated initiatives if no suitable projects exist.');
    }

    if (total > 0 && reported === 0) {
      recommendations.push('Schedule regular check-ins with project owners to collect actual impact data.');
      recommendations.push('Create standardized impact reporting templates for consistency.');
      recommendations.push('Set up automated reminders for impact reporting milestones.');
    }

    if (completionRate > 0 && completionRate < 50) {
      recommendations.push('Improve reporting compliance by clarifying expectations and deadlines.');
      recommendations.push('Provide training on how to measure and report impact effectively.');
    }

    if (total > 0) {
      recommendations.push('Review the combined planned impact to assess if the target can be achieved.');
      recommendations.push('Identify high-performing projects and scale their approaches across other initiatives.');
      recommendations.push('For projects with negative variance, provide additional support or resources.');
    }

    recommendations.push('Schedule quarterly priority reviews with the owner to assess progress.');
    recommendations.push('Consider adjusting the target if cumulative impact suggests it is unrealistic or too conservative.');

    return recommendations.slice(0, 5);
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Loading analytics...</div>;
  }

  if (analytics.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <p className="text-slate-600">No active priorities to analyze.</p>
        <p className="text-sm text-slate-500 mt-1">Create priorities in the Strategic Priorities tab to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-600">
          AI-powered insights and recommendations to help achieve organizational priorities
        </p>
      </div>

      <div className="grid gap-6">
        {analytics.map((data) => (
          <div key={data.priority.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-1">{data.priority.title}</h3>
                  <p className="text-sm text-slate-600">
                    Target: <span className="font-medium text-slate-900">{data.priority.target_value}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Owner: <span className="font-medium text-slate-900">{data.priority.owner}</span>
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Total Projects</p>
                  <p className="text-2xl font-bold text-blue-700">{data.totalProjects}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Reported</p>
                  <p className="text-2xl font-bold text-green-700">{data.reportedProjects}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Unreported</p>
                  <p className="text-2xl font-bold text-amber-700">{data.unreportedProjects}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-indigo-700">{data.completionRate.toFixed(0)}%</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <h4 className="text-lg font-semibold text-slate-900">Key Insights</h4>
                </div>
                <div className="space-y-2">
                  {data.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 text-slate-700">
                      <span className="text-blue-600 mt-1">•</span>
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  <h4 className="text-lg font-semibold text-slate-900">Recommendations</h4>
                </div>
                <div className="space-y-2">
                  {data.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {data.unreportedProjects > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900 mb-1">Action Required</p>
                      <p className="text-sm text-amber-800">
                        {data.unreportedProjects} {data.unreportedProjects === 1 ? 'project has' : 'projects have'} not reported actual impact.
                        Follow up with project teams to ensure timely updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 text-slate-700 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">General Best Practices</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Review priorities quarterly to ensure they remain aligned with organizational strategy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Maintain a balanced portfolio with 3-5 active priorities to avoid spreading resources too thin</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Ensure each priority has clear ownership and accountability mechanisms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Celebrate wins and share success stories to maintain momentum</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                <span>Use data-driven decision making to adjust priorities based on actual performance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
