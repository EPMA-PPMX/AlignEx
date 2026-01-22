import React, { useState } from 'react';
import { Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Calendar, DollarSign, Clock } from 'lucide-react';
import { formatDate as utilFormatDate, formatCurrencyWithK } from '../../lib/utils';

interface ProjectRequest {
  id: string;
  project_name: string;
  description: string;
  project_type: string;
  problem_statement: string;
  estimated_start_date: string | null;
  estimated_duration: number | null;
  initial_estimated_cost: number | null;
  expected_benefits: string;
  consequences_of_inaction: string;
  comments: string | null;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'More Information Needed';
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comments: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  request: ProjectRequest;
  onEdit: (request: ProjectRequest) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: string, reviewComments?: string) => void;
}

export default function RequestCard({ request, onEdit, onDelete, onStatusChange }: Props) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | 'More Information Needed' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Pending Approval':
        return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white border-transparent';
      case 'Approved':
        return 'bg-gradient-to-br from-[#276A6C] to-[#5DB6B8] text-white border-transparent';
      case 'Rejected':
        return 'bg-gradient-to-br from-[#D43E3E] to-[#FE8A8A] text-white border-transparent';
      case 'More Information Needed':
        return 'bg-gradient-to-br from-[#C76F21] to-[#FAAF65] text-white border-transparent';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = utilFormatDate;

  const handleReviewSubmit = () => {
    if (reviewAction) {
      onStatusChange(request.id, reviewAction, reviewComments || undefined);
      setShowReviewDialog(false);
      setReviewAction(null);
      setReviewComments('');
    }
  };

  const openReviewDialog = (action: 'Approved' | 'Rejected' | 'More Information Needed') => {
    setReviewAction(action);
    setShowReviewDialog(true);
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">{request.project_name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(request.status)}`}>
                {request.status}
              </span>
            </div>
            {request.description && (
              <p className="text-slate-600 text-sm mb-3">{request.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="px-2 py-1 bg-slate-100 rounded">{request.project_type}</span>
              {request.estimated_start_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(request.estimated_start_date)}</span>
                </div>
              )}
              {request.estimated_duration && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{request.estimated_duration} months</span>
                </div>
              )}
              {request.initial_estimated_cost && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatCurrencyWithK(request.initial_estimated_cost)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            {(request.status === 'Draft' || request.status === 'More Information Needed') && (
              <button
                onClick={() => onEdit(request)}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Edit request"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {request.status === 'Draft' && (
              <button
                onClick={() => onDelete(request.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete request"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-slate-700">Problem Statement:</span>
            <p className="text-slate-600 mt-1">{request.problem_statement}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-slate-700">Expected Benefits:</span>
              <p className="text-slate-600 mt-1">{request.expected_benefits}</p>
            </div>
            <div>
              <span className="font-medium text-slate-700">Consequences of Inaction:</span>
              <p className="text-slate-600 mt-1">{request.consequences_of_inaction}</p>
            </div>
          </div>

          {request.comments && (
            <div>
              <span className="font-medium text-slate-700">Additional Comments:</span>
              <p className="text-slate-600 mt-1">{request.comments}</p>
            </div>
          )}

          {request.review_comments && (
            <div className="bg-primary-50 border border-blue-200 rounded-lg p-3">
              <span className="font-medium text-blue-900">Review Comments:</span>
              <p className="text-blue-800 mt-1">{request.review_comments}</p>
              {request.reviewed_at && (
                <p className="text-xs text-primary-600 mt-2">
                  Reviewed on {formatDate(request.reviewed_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {request.status === 'Pending Approval' && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={() => openReviewDialog('Approved')}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => openReviewDialog('Rejected')}
              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => openReviewDialog('More Information Needed')}
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              Request More Info
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <span>Created {formatDate(request.created_at)}</span>
          {request.submitted_at && (
            <span>Submitted {formatDate(request.submitted_at)}</span>
          )}
        </div>
      </div>

      {showReviewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-widget-bg rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {reviewAction === 'Approved' && 'Approve Request'}
              {reviewAction === 'Rejected' && 'Reject Request'}
              {reviewAction === 'More Information Needed' && 'Request More Information'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Review Comments {reviewAction !== 'Approved' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your comments..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewDialog(false);
                  setReviewAction(null);
                  setReviewComments('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={reviewAction !== 'Approved' && !reviewComments.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
