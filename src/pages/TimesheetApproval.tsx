import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';
import { CheckCircle, XCircle, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface TimesheetSubmission {
  id: string;
  user_email: string;
  week_start_date: string;
  week_end_date: string;
  status: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_comments?: string;
}

interface TimesheetEntry {
  id: string;
  entry_date: string;
  hours: number;
  is_billable: boolean;
  project_id: string | null;
  initiation_request_id: string | null;
  non_project_category_id: string | null;
  notes: string;
  project?: { id: string; name: string };
  initiation_request?: { id: string; project_name: string };
  non_project_category?: { id: string; name: string };
}

interface ProjectTimesheets {
  projectId: string;
  projectName: string;
  submissions: (TimesheetSubmission & { entries: TimesheetEntry[] })[];
}

const TimesheetApproval: React.FC = () => {
  const { showConfirm } = useNotification();
  const [projectTimesheets, setProjectTimesheets] = useState<ProjectTimesheets[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<string>>(new Set());
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchTimesheets();
  }, []);

  const fetchTimesheets = async () => {
    setLoading(true);
    const PM_EMAIL = 'demo@alignex.com';

    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, project_manager')
        .eq('project_manager', PM_EMAIL);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setLoading(false);
        return;
      }

      const projects = projectsData || [];
      const projectIds = projects.map(p => p.id);

      if (projectIds.length === 0) {
        setProjectTimesheets([]);
        setLoading(false);
        return;
      }

      const { data: entriesData, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          project:projects(id, name),
          initiation_request:project_initiation_requests(id, project_name),
          non_project_category:non_project_work_categories(id, name)
        `)
        .in('project_id', projectIds);

      if (entriesError) {
        console.error('Error fetching entries:', entriesError);
      }

      const entries = entriesData || [];

      const userEmailsWithEntries = [...new Set(entries.map(e => e.user_id || 'anonymous'))];

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('timesheet_submissions')
        .select('*')
        .in('status', ['submitted', 'approved', 'rejected'])
        .order('submitted_at', { ascending: false });

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
      }

      const submissions = submissionsData || [];

      const projectTimesheetsMap = new Map<string, ProjectTimesheets>();

      projects.forEach(project => {
        projectTimesheetsMap.set(project.id, {
          projectId: project.id,
          projectName: project.name,
          submissions: []
        });
      });

      submissions.forEach(submission => {
        const submissionEntries = entries.filter(entry => {
          const entryDate = entry.entry_date;
          return entryDate >= submission.week_start_date &&
                 entryDate <= submission.week_end_date &&
                 entry.user_id === submission.user_email;
        });

        submissionEntries.forEach(entry => {
          if (entry.project_id && projectTimesheetsMap.has(entry.project_id)) {
            const projectTimesheet = projectTimesheetsMap.get(entry.project_id)!;
            let existingSubmission = projectTimesheet.submissions.find(s => s.id === submission.id);

            if (!existingSubmission) {
              existingSubmission = { ...submission, entries: [] };
              projectTimesheet.submissions.push(existingSubmission);
            }

            existingSubmission.entries.push(entry);
          }
        });
      });

      const projectTimesheetsArray = Array.from(projectTimesheetsMap.values())
        .filter(pt => pt.submissions.length > 0);

      setProjectTimesheets(projectTimesheetsArray);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const toggleSubmission = (submissionId: string) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  const handleApprove = async (submissionId: string) => {
    const confirmed = await showConfirm({
      title: 'Approve Timesheet',
      message: 'Approve this timesheet?',
      confirmText: 'Approve'
    });
    if (!confirmed) return;

    setProcessingAction(submissionId);

    try {
      const PM_EMAIL = 'demo@alignex.com';

      const { error } = await supabase
        .from('timesheet_submissions')
        .update({
          status: 'approved',
          reviewed_by: PM_EMAIL,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: reviewComment || null
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error approving timesheet:', error);
        alert('Error approving timesheet');
        return;
      }

      alert('Timesheet approved successfully!');
      setReviewComment('');
      setSelectedSubmission(null);
      await fetchTimesheets();
    } catch (error) {
      console.error('Error:', error);
      alert('Error approving timesheet');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!reviewComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Reject Timesheet',
      message: 'Reject this timesheet? The user will be able to recall and resubmit.',
      confirmText: 'Reject'
    });
    if (!confirmed) return;

    setProcessingAction(submissionId);

    try {
      const PM_EMAIL = 'demo@alignex.com';

      const { error } = await supabase
        .from('timesheet_submissions')
        .update({
          status: 'rejected',
          reviewed_by: PM_EMAIL,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: reviewComment
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error rejecting timesheet:', error);
        alert('Error rejecting timesheet');
        return;
      }

      alert('Timesheet rejected successfully!');
      setReviewComment('');
      setSelectedSubmission(null);
      await fetchTimesheets();
    } catch (error) {
      console.error('Error:', error);
      alert('Error rejecting timesheet');
    } finally {
      setProcessingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const groupEntriesByDate = (entries: TimesheetEntry[]) => {
    const grouped = new Map<string, TimesheetEntry[]>();
    entries.forEach(entry => {
      if (!grouped.has(entry.entry_date)) {
        grouped.set(entry.entry_date, []);
      }
      grouped.get(entry.entry_date)!.push(entry);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading timesheets...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Timesheet Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve timesheet submissions for your projects</p>
      </div>

      {projectTimesheets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">No pending timesheet submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projectTimesheets.map(projectTimesheet => (
            <div key={projectTimesheet.projectId} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div
                className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                onClick={() => toggleProject(projectTimesheet.projectId)}
              >
                <div className="flex items-center gap-2">
                  {expandedProjects.has(projectTimesheet.projectId) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">{projectTimesheet.projectName}</h2>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {projectTimesheet.submissions.length} submission{projectTimesheet.submissions.length !== 1 ? 's' : ''}
                </span>
              </div>

              {expandedProjects.has(projectTimesheet.projectId) && (
                <div className="p-4 space-y-4">
                  {projectTimesheet.submissions.map(submission => (
                    <div key={submission.id} className="border rounded-lg overflow-hidden">
                      <div
                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSubmission(submission.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedSubmissions.has(submission.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{submission.user_email}</div>
                              <div className="text-sm text-gray-600">
                                Week: {formatDate(submission.week_start_date)} - {formatDate(submission.week_end_date)}
                              </div>
                              <div className="text-sm text-gray-600">
                                Submitted: {formatDate(submission.submitted_at)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {submission.total_hours.toFixed(2)} hrs
                            </div>
                            <div className="text-sm text-gray-600">
                              B: {submission.billable_hours.toFixed(2)} | NB: {submission.non_billable_hours.toFixed(2)}
                            </div>
                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${
                              submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                              submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {expandedSubmissions.has(submission.id) && (
                        <div className="p-4 bg-white border-t space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Time Entries</h4>
                            <div className="space-y-3">
                              {groupEntriesByDate(submission.entries).map(([date, entries]) => (
                                <div key={date} className="border rounded p-3">
                                  <div className="font-medium text-gray-700 mb-2">{formatDate(date)}</div>
                                  <div className="space-y-2">
                                    {entries.map(entry => (
                                      <div key={entry.id} className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                          <div className="font-medium text-gray-900">
                                            {entry.project?.name || entry.initiation_request?.project_name || entry.non_project_category?.name || 'Unknown'}
                                          </div>
                                          {entry.notes && (
                                            <div className="text-gray-600 text-xs mt-1">{entry.notes}</div>
                                          )}
                                        </div>
                                        <div className="text-right ml-4">
                                          <div className={`font-medium ${entry.is_billable ? 'text-green-700' : 'text-gray-700'}`}>
                                            {entry.hours.toFixed(2)} hrs
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {entry.is_billable ? 'Billable' : 'Non-Billable'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {submission.status === 'submitted' && (
                            <div className="border-t pt-4">
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Comments (optional for approval, required for rejection)
                                </label>
                                <textarea
                                  value={selectedSubmission === submission.id ? reviewComment : ''}
                                  onChange={(e) => {
                                    setSelectedSubmission(submission.id);
                                    setReviewComment(e.target.value);
                                  }}
                                  placeholder="Add comments about this timesheet..."
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleApprove(submission.id)}
                                  disabled={processingAction === submission.id}
                                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(submission.id)}
                                  disabled={processingAction === submission.id}
                                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <XCircle className="w-5 h-5" />
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}

                          {submission.status === 'approved' && submission.reviewer_comments && (
                            <div className="border-t pt-4">
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <div className="text-sm font-medium text-green-800 mb-1">Approved by {submission.reviewed_by}</div>
                                <div className="text-sm text-green-700">{submission.reviewer_comments}</div>
                                <div className="text-xs text-green-600 mt-1">
                                  {submission.reviewed_at && formatDate(submission.reviewed_at)}
                                </div>
                              </div>
                            </div>
                          )}

                          {submission.status === 'rejected' && (
                            <div className="border-t pt-4">
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <div className="text-sm font-medium text-red-800 mb-1">Rejected by {submission.reviewed_by}</div>
                                <div className="text-sm text-red-700">{submission.reviewer_comments}</div>
                                <div className="text-xs text-red-600 mt-1">
                                  {submission.reviewed_at && formatDate(submission.reviewed_at)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimesheetApproval;
