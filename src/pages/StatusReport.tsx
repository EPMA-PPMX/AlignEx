import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertTriangle, FileText, DollarSign, CheckSquare, Users, TrendingUp, Send, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import StepProjectSelection from '../components/status-report/StepProjectSelection';
import StepRisks from '../components/status-report/StepRisks';
import StepIssues from '../components/status-report/StepIssues';
import StepChangeRequests from '../components/status-report/StepChangeRequests';
import StepBudget from '../components/status-report/StepBudget';
import StepTasks from '../components/status-report/StepTasks';
import StepTeam from '../components/status-report/StepTeam';
import StepBenefits from '../components/status-report/StepBenefits';
import StepSummary from '../components/status-report/StepSummary';

const STEPS = [
  { id: 'project', label: 'Project & Week', icon: FileText },
  { id: 'risks', label: 'Risks', icon: AlertTriangle },
  { id: 'issues', label: 'Issues', icon: AlertTriangle },
  { id: 'changes', label: 'Change Requests', icon: FileText },
  { id: 'budget', label: 'Budget', icon: DollarSign },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'benefits', label: 'Benefits', icon: TrendingUp },
  { id: 'summary', label: 'Summary', icon: Check },
];

interface StatusReportData {
  statusReportId?: string;
  projectId: string;
  weekEndingDate: string;
  statusComment: string;
  risks: any[];
  issues: any[];
  changeRequests: any[];
  budget: any[];
  tasks: any[];
  team: any[];
  benefits: any[];
}

export default function StatusReport() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [reportData, setReportData] = useState<StatusReportData>({
    projectId: '',
    weekEndingDate: '',
    statusComment: '',
    risks: [],
    issues: [],
    changeRequests: [],
    budget: [],
    tasks: [],
    team: [],
    benefits: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentStepId = STEPS[currentStep].id;

  const updateReportData = (field: string, value: any) => {
    setReportData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await saveStatusReport('draft');
      alert('Status report saved as draft successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await saveStatusReport('submitted');
      alert('Status report submitted successfully!');
      navigate('/projects');
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveStatusReport = async (status: 'draft' | 'submitted') => {
    if (!reportData.projectId || !reportData.weekEndingDate) {
      throw new Error('Project and week ending date are required');
    }

    try {
      const existingReport = await supabase
        .from('status_reports')
        .select('id')
        .eq('project_id', reportData.projectId)
        .eq('week_ending_date', reportData.weekEndingDate)
        .maybeSingle();

      if (existingReport.error && existingReport.error.code !== 'PGRST116') {
        throw existingReport.error;
      }

      let statusReportId = existingReport.data?.id || reportData.statusReportId;

      if (statusReportId) {
        const { error } = await supabase
          .from('status_reports')
          .update({
            status,
            status_comment: reportData.statusComment || '',
            submitted_at: status === 'submitted' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', statusReportId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('status_reports')
          .insert({
            project_id: reportData.projectId,
            week_ending_date: reportData.weekEndingDate,
            status,
            status_comment: reportData.statusComment || '',
            submitted_at: status === 'submitted' ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;
        statusReportId = data.id;
        setReportData((prev) => ({ ...prev, statusReportId }));
      }
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Weekly Status Report</h1>
            <p className="text-sm text-gray-600 mt-1">Create a comprehensive status report for your project</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span
                        className={`ml-2 text-sm font-medium hidden lg:block ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 min-h-[500px]">
            {currentStepId === 'project' && (
              <StepProjectSelection reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'risks' && (
              <StepRisks reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'issues' && (
              <StepIssues reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'changes' && (
              <StepChangeRequests reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'budget' && (
              <StepBudget reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'tasks' && (
              <StepTasks reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'team' && (
              <StepTeam reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'benefits' && (
              <StepBenefits reportData={reportData} updateReportData={updateReportData} />
            )}
            {currentStepId === 'summary' && (
              <StepSummary reportData={reportData} updateReportData={updateReportData} />
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving || !reportData.projectId || !reportData.weekEndingDate}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!reportData.projectId || !reportData.weekEndingDate}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={saving || !reportData.projectId || !reportData.weekEndingDate}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {saving ? 'Submitting...' : 'Submit Report'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
