import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { DEMO_USER_ID } from '../../lib/useCurrentUser';
import { Link } from 'react-router-dom';

interface ChangeRequest {
  id: string;
  project_id: string;
  request_title: string;
  status: string;
  type: string;
  created_at: string;
  projects?: {
    id: string;
    name: string;
  };
}

export default function PendingApprovalsWidget() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('change_requests')
        .select(`
          id,
          project_id,
          request_title,
          status,
          type,
          created_at,
          projects (
            id,
            name
          )
        `)
        .in('status', ['Pending Review', 'Under Review'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending Review':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Under Review':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'Budget Change':
        return 'text-red-700 bg-red-100';
      case 'Schedule Change':
        return 'text-yellow-700 bg-yellow-100';
      case 'Scope Change':
        return 'text-blue-700 bg-blue-100';
      case 'Resource Change':
        return 'text-purple-700 bg-purple-100';
      case 'Quality Change':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Approvals
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Pending Approvals
        </h3>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
          {requests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <CheckCircle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No pending approvals</p>
          <p className="text-sm text-gray-500">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/projects/${request.project_id}`}
              className="block bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {getStatusIcon(request.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {request.request_title}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {request.projects?.name}
                    </p>
                  </div>
                </div>
                {request.type && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${getTypeClass(request.type)}`}>
                    {request.type}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{request.status}</span>
                <span>{new Date(request.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
