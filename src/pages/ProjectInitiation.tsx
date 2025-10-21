import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProjectRequestForm from '../components/initiation/ProjectRequestForm';

interface ProjectRequest {
  id: string;
  project_name: string;
  description: string;
  project_type: string;
  problem_statement: string;
  estimated_start_date: string | null;
  estimated_duration: string | null;
  initial_estimated_cost: string | null;
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

export default function ProjectInitiation() {
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<ProjectRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<ProjectRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const statuses = [
    { value: 'all', label: 'All Requests', icon: FileText, color: 'slate' },
    { value: 'Draft', label: 'Draft', icon: FileText, color: 'slate' },
    { value: 'Pending Approval', label: 'Pending Approval', icon: Clock, color: 'amber' },
    { value: 'Approved', label: 'Approved', icon: CheckCircle, color: 'green' },
    { value: 'Rejected', label: 'Rejected', icon: XCircle, color: 'red' },
    { value: 'More Information Needed', label: 'More Info Needed', icon: AlertCircle, color: 'blue' },
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_initiation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingRequest(null);
    fetchRequests();
  };

  const handleView = (request: ProjectRequest) => {
    setViewingRequest(request);
  };

  const handleEdit = (request: ProjectRequest) => {
    setEditingRequest(request);
    setShowForm(true);
    setViewingRequest(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('project_initiation_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setViewingRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string, reviewComments?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'Pending Approval') {
        updateData.submitted_at = new Date().toISOString();
      }

      if (reviewComments !== undefined) {
        updateData.review_comments = reviewComments;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_initiation_requests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      fetchRequests();

      const updatedRequest = requests.find(r => r.id === id);
      if (updatedRequest && viewingRequest?.id === id) {
        setViewingRequest({ ...updatedRequest, ...updateData });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.project_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    if (status === 'all') return requests.length;
    return requests.filter((req) => req.status === status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Pending Approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'More Information Needed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Loading project requests...</div>;
  }

  if (showForm) {
    return (
      <ProjectRequestForm
        request={editingRequest}
        onClose={handleFormClose}
      />
    );
  }

  if (viewingRequest) {
    return <RequestDetailsView request={viewingRequest} onClose={() => setViewingRequest(null)} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Project Initiation</h1>
          <p className="text-slate-600 mt-2">
            Submit and manage project initiation requests
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRequest(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name, description, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {statuses.map((status) => {
          const Icon = status.icon;
          const isActive = selectedStatus === status.value;
          const count = getStatusCount(status.value);

          return (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${
                  isActive
                    ? `border-${status.color}-500 bg-${status.color}-50`
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? `text-${status.color}-600` : 'text-slate-400'}`} />
                <span className={`text-xs font-medium ${isActive ? `text-${status.color}-900` : 'text-slate-600'}`}>
                  {status.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${isActive ? `text-${status.color}-700` : 'text-slate-700'}`}>
                {count}
              </p>
            </button>
          );
        })}
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-600">
            {searchQuery
              ? 'No requests match your search criteria.'
              : 'No project requests yet. Click "New Request" to create one.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Project Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Start Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Est. Cost</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => handleView(request)}
                >
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">{request.project_name}</p>
                      {request.description && (
                        <p className="text-sm text-slate-500 truncate max-w-md">{request.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-slate-700">{request.project_type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {formatDate(request.estimated_start_date)}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {request.initial_estimated_cost || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(request);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
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

function RequestDetailsView({ request, onClose, onEdit, onDelete, onStatusChange }: {
  request: ProjectRequest;
  onClose: () => void;
  onEdit: (request: ProjectRequest) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: string, reviewComments?: string) => void;
}) {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'Approved' | 'Rejected' | 'More Information Needed' | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Pending Approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'More Information Needed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              ← Back to List
            </button>
            <h1 className="text-3xl font-bold text-slate-900">{request.project_name}</h1>
            <span className={`px-3 py-1 text-sm font-medium rounded border ${getStatusColor(request.status)}`}>
              {request.status}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(request)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            {request.status === 'Draft' && (
              <button
                onClick={() => onDelete(request.id)}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-500">Project Type</label>
              <p className="text-slate-900 mt-1">{request.project_type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Estimated Start Date</label>
              <p className="text-slate-900 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(request.estimated_start_date)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Estimated Duration</label>
              <p className="text-slate-900 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                {request.estimated_duration || 'Not specified'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-500">Initial Estimated Cost</label>
            <p className="text-slate-900 mt-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              {request.initial_estimated_cost || 'Not specified'}
            </p>
          </div>

          {request.description && (
            <div>
              <label className="text-sm font-medium text-slate-500">Description</label>
              <p className="text-slate-900 mt-1">{request.description}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <label className="text-sm font-medium text-slate-500">Problem Statement</label>
            <p className="text-slate-900 mt-1">{request.problem_statement}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-500">Expected Benefits</label>
              <p className="text-slate-900 mt-1">{request.expected_benefits}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">Consequences of Inaction</label>
              <p className="text-slate-900 mt-1">{request.consequences_of_inaction}</p>
            </div>
          </div>

          {request.comments && (
            <div>
              <label className="text-sm font-medium text-slate-500">Additional Comments</label>
              <p className="text-slate-900 mt-1">{request.comments}</p>
            </div>
          )}

          {request.review_comments && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="text-sm font-medium text-blue-900">Review Comments</label>
              <p className="text-blue-800 mt-1">{request.review_comments}</p>
              {request.reviewed_at && (
                <p className="text-xs text-blue-600 mt-2">
                  Reviewed on {formatDate(request.reviewed_at)}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-sm text-slate-500">
            <span>Created {formatDate(request.created_at)}</span>
            {request.submitted_at && (
              <span>Submitted {formatDate(request.submitted_at)}</span>
            )}
          </div>
        </div>

        {request.status === 'Pending Approval' && (
          <div className="flex gap-3 bg-white border border-slate-200 rounded-lg p-4">
            <button
              onClick={() => openReviewDialog('Approved')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => openReviewDialog('Rejected')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => openReviewDialog('More Information Needed')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <AlertCircle className="w-4 h-4" />
              Request More Info
            </button>
          </div>
        )}
      </div>

      {showReviewDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
