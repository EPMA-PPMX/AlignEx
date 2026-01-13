import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, AlertCircle, FileEdit, DollarSign, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepSummary({ reportData, updateReportData }: Props) {
  const [summary, setSummary] = useState({
    risks: 0,
    openRisks: 0,
    issues: 0,
    openIssues: 0,
    changeRequests: 0,
    pendingChangeRequests: 0,
    teamMembers: 0,
    budgetCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reportData.projectId) {
      loadSummary();
    }
  }, [reportData.projectId]);

  const loadSummary = async () => {
    try {
      setLoading(true);

      const [risksData, issuesData, changeRequestsData, teamData, budgetData] = await Promise.all([
        supabase.from('project_risks').select('id, status', { count: 'exact' }).eq('project_id', reportData.projectId),
        supabase.from('project_issues').select('id, status', { count: 'exact' }).eq('project_id', reportData.projectId),
        supabase.from('change_requests').select('id, status', { count: 'exact' }).eq('project_id', reportData.projectId),
        supabase.from('project_team_members').select('id', { count: 'exact' }).eq('project_id', reportData.projectId),
        supabase.from('budget_forecast_monthly').select('category', { count: 'exact' }).eq('project_id', reportData.projectId),
      ]);

      const openRisks = (risksData.data || []).filter((r: any) => r.status === 'open').length;
      const openIssues = (issuesData.data || []).filter((i: any) => i.status === 'open' || i.status === 'in_progress').length;
      const pendingCRs = (changeRequestsData.data || []).filter((cr: any) => cr.status === 'pending' || cr.status === 'in_review').length;

      const uniqueCategories = new Set((budgetData.data || []).map((b: any) => b.category));

      setSummary({
        risks: risksData.count || 0,
        openRisks,
        issues: issuesData.count || 0,
        openIssues,
        changeRequests: changeRequestsData.count || 0,
        pendingChangeRequests: pendingCRs,
        teamMembers: teamData.count || 0,
        budgetCategories: uniqueCategories.size,
      });
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Summary</h2>
        <p className="text-gray-600">Review the summary and provide an overall status comment</p>
      </div>

      {loading ? (
        <div className="text-center py-8 bg-widget-bg rounded-lg border border-gray-200">
          <p className="text-gray-500">Loading summary...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Risks</h4>
                <p className="text-sm text-gray-600">Project risk tracking</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-700"><strong>Total:</strong> {summary.risks}</span>
              <span className="text-orange-600 font-semibold"><strong>Open:</strong> {summary.openRisks}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Issues</h4>
                <p className="text-sm text-gray-600">Active project issues</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-700"><strong>Total:</strong> {summary.issues}</span>
              <span className="text-red-600 font-semibold"><strong>Active:</strong> {summary.openIssues}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileEdit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Change Requests</h4>
                <p className="text-sm text-gray-600">Scope changes</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-700"><strong>Total:</strong> {summary.changeRequests}</span>
              <span className="text-yellow-600 font-semibold"><strong>Pending:</strong> {summary.pendingChangeRequests}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Team</h4>
                <p className="text-sm text-gray-600">Assigned resources</p>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-700"><strong>Team Members:</strong> {summary.teamMembers}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Budget</h4>
                <p className="text-sm text-gray-600">Tracked categories</p>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-gray-700"><strong>Categories:</strong> {summary.budgetCategories}</span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Status Comment <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reportData.statusComment}
          onChange={(e) => updateReportData('statusComment', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={6}
          placeholder="Provide a narrative summary of the project status for this week. Include highlights, challenges, and next steps..."
        />
        <p className="text-xs text-gray-500 mt-1">
          This will be the main status narrative for stakeholders
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>Ready to submit:</strong> All project data has been updated. Click "Submit Report" below to finalize your weekly status report.
        </p>
      </div>
    </div>
  );
}
