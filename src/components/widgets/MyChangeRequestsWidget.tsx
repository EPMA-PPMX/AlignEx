import { useState, useEffect } from 'react';
import { FileEdit, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
  priority: string;
  projects?: {
    id: string;
    name: string;
  };
}

export default function MyChangeRequestsWidget() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyChangeRequests();
  }, []);

  const fetchMyChangeRequests = async () => {
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
          priority,
          created_at,
          projects (
            id,
            name
          )
        `)
        .eq('requested_by', DEMO_USER_ID)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching my change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft':
        return <FileEdit className="w-4 h-4 text-[#7F8C8D]" />;
      case 'Pending':
      case 'Pending Review':
        return <Clock className="w-4 h-4 text-[#F39C12]" />;
      case 'In Review':
      case 'Under Review':
        return <AlertCircle className="w-4 h-4 text-[#26D0CE]" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-[#2ECC71]" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-[#E74C3C]" />;
      case 'Implemented':
        return <CheckCircle className="w-4 h-4 text-[#1ABC9C]" />;
      default:
        return <Clock className="w-4 h-4 text-[#7F8C8D]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'text-[#7F8C8D] bg-[#7F8C8D] bg-opacity-20';
      case 'Pending':
      case 'Pending Review':
        return 'text-[#F39C12] bg-[#F39C12] bg-opacity-20';
      case 'In Review':
      case 'Under Review':
        return 'text-[#26D0CE] bg-[#26D0CE] bg-opacity-20';
      case 'Approved':
        return 'text-[#2ECC71] bg-[#2ECC71] bg-opacity-20';
      case 'Rejected':
        return 'text-[#E74C3C] bg-[#E74C3C] bg-opacity-20';
      case 'Implemented':
        return 'text-[#1ABC9C] bg-[#1ABC9C] bg-opacity-20';
      default:
        return 'text-[#7F8C8D] bg-[#7F8C8D] bg-opacity-20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'text-[#E74C3C]';
      case 'High':
        return 'text-[#F39C12]';
      case 'Medium':
        return 'text-[#26D0CE]';
      case 'Low':
        return 'text-[#2ECC71]';
      default:
        return 'text-[#7F8C8D]';
    }
  };

  if (loading) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <FileEdit className="w-4 h-4" />
            My Change Requests
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
    <div className="bg-widget-bg rounded-lg shadow-sm p-4 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-[#5B2C91]" />
          My Change Requests
        </h3>
        <span className="px-2 py-1 bg-[#5B2C91] bg-opacity-20 text-[#5B2C91] text-xs rounded-full font-medium">
          {requests.length}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <FileEdit className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No change requests</p>
          <p className="text-sm text-gray-500">You haven't created any change requests yet</p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/projects/${request.project_id}`}
              className="block bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-[#26D0CE] transition-all"
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
                {request.priority && (
                  <span className={`text-xs font-bold ${getPriorityColor(request.priority)}`}>
                    {request.priority}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
                {request.type && (
                  <span className="text-gray-500">
                    {request.type}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
