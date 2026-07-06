import { useState, useEffect } from "react";
import { Activity, FileText, AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";

interface ActivityItem {
  id: string;
  type: "project" | "task" | "risk" | "issue" | "change_request";
  title: string;
  action: string;
  timestamp: string;
  project_name?: string;
}

export default function RecentActivityWidget() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);

      const [
        { data: projects, error: projectsError },
        { data: risks, error: risksError },
        { data: issues, error: issuesError },
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, updated_at, state")
          .order("updated_at", { ascending: false })
          .limit(5),

        supabase
          .from("project_risks")
          .select("id, title, project_id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),

        supabase
          .from("project_issues")
          .select("id, title, project_id, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      if (projectsError) throw projectsError;
      if (risksError) throw risksError;
      if (issuesError) throw issuesError;

      const projectMap = new Map<string, string>(
        (projects || []).map((project: { id: string; name: string }) => [
          project.id,
          project.name,
        ]),
      );

      const allActivities: ActivityItem[] = [];

      // Project activities
      (projects || []).forEach(
        (project: {
          id: string;
          name: string;
          state: string;
          updated_at: string;
        }) => {
          allActivities.push({
            id: project.id,
            type: "project",
            title: project.name,
            action: `Status updated to ${project.state}`,
            timestamp: project.updated_at,
            project_name: project.name,
          });
        },
      );

      // Risk activities
      (risks || []).forEach(
        (risk: {
          id: string;
          title: string;
          project_id: string;
          updated_at: string;
        }) => {
          allActivities.push({
            id: risk.id,
            type: "risk",
            title: risk.title,
            action: "Risk updated",
            timestamp: risk.updated_at,
            project_name: projectMap.get(risk.project_id) || "Unknown Project",
          });
        },
      );

      // Issue activities
      (issues || []).forEach(
        (issue: {
          id: string;
          title: string;
          project_id: string;
          updated_at: string;
        }) => {
          allActivities.push({
            id: issue.id,
            type: "issue",
            title: issue.title,
            action: "Issue updated",
            timestamp: issue.updated_at,
            project_name: projectMap.get(issue.project_id) || "Unknown Project",
          });
        },
      );

      // Sort newest first
      allActivities.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setActivities(allActivities.slice(0, 8));
    } catch (err) {
      console.error("Error fetching activity:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FileText className="w-4 h-4" />;
      case "risk":
        return <AlertTriangle className="w-4 h-4" />;
      case "issue":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "project":
        return "bg-blue-100 text-blue-700";
      case "risk":
        return "bg-yellow-100 text-yellow-700";
      case "issue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Activity
          </h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-widget-bg rounded-lg shadow-sm p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Recent Activity
        </h3>
      </div>

      {activities.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Activity className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-1">No recent activity</p>
          <p className="text-sm text-gray-500">
            Activity will appear here as things happen
          </p>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${getActivityColor(activity.type)} flex-shrink-0`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-gray-900 font-medium text-sm mb-0.5 truncate">
                    {activity.title}
                  </h4>
                  <p className="text-xs text-gray-600 truncate mb-1">
                    {activity.action}
                  </p>
                  {activity.project_name && (
                    <p className="text-xs text-gray-500 truncate">
                      {activity.project_name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {getTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1">
            View All Activity
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
