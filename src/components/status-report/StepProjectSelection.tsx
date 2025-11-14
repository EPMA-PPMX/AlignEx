import { useState, useEffect } from 'react';
import { Calendar, Folder } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepProjectSelection({ reportData, updateReportData }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + daysUntilFriday);
    return nextFriday.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!reportData.weekEndingDate) {
      updateReportData('weekEndingDate', getNextFriday());
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Project and Week</h2>
        <p className="text-gray-600">Choose the project and week ending date for this status report</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Folder className="w-4 h-4" />
            Project <span className="text-red-500">*</span>
          </label>
          {loading ? (
            <div className="text-sm text-gray-500">Loading projects...</div>
          ) : (
            <select
              value={reportData.projectId}
              onChange={(e) => updateReportData('projectId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} - {project.status}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4" />
            Week Ending Date (Friday) <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={reportData.weekEndingDate}
            onChange={(e) => updateReportData('weekEndingDate', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Select the Friday of the week you're reporting on
          </p>
        </div>

        {reportData.projectId && reportData.weekEndingDate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Ready to continue:</strong> You've selected a project and week. Click "Next" to begin filling out the status report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
