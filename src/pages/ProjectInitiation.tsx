import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProjectRequestForm from '../components/initiation/ProjectRequestForm';
import RequestCard from '../components/initiation/RequestCard';

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

  const handleEdit = (request: ProjectRequest) => {
    setEditingRequest(request);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('project_initiation_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
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

  const groupedRequests = statuses.reduce((acc, status) => {
    if (status.value !== 'all') {
      acc[status.value] = filteredRequests.filter((req) => req.status === status.value);
    }
    return acc;
  }, {} as Record<string, ProjectRequest[]>);

  const getStatusCount = (status: string) => {
    if (status === 'all') return requests.length;
    return requests.filter((req) => req.status === status).length;
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
      ) : selectedStatus === 'all' ? (
        <div className="space-y-6">
          {statuses
            .filter((s) => s.value !== 'all')
            .map((status) => {
              const statusRequests = groupedRequests[status.value];
              if (!statusRequests || statusRequests.length === 0) return null;

              const Icon = status.icon;

              return (
                <div key={status.value}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 text-${status.color}-600`} />
                    <h2 className="text-lg font-semibold text-slate-900">
                      {status.label} ({statusRequests.length})
                    </h2>
                  </div>
                  <div className="grid gap-4">
                    {statusRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
