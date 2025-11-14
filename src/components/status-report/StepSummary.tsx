import { FileText } from 'lucide-react';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepSummary({ reportData, updateReportData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Status Summary</h2>
        <p className="text-gray-600">Provide an overall status comment for this week</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status Comment
        </label>
        <textarea
          value={reportData.statusComment}
          onChange={(e) => updateReportData('statusComment', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={6}
          placeholder="Provide a narrative summary of the project status for this week..."
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Report Summary</h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-700"><strong>Risks:</strong> {reportData.risks.length} items</p>
          <p className="text-gray-700"><strong>Issues:</strong> {reportData.issues.length} items</p>
          <p className="text-gray-700"><strong>Change Requests:</strong> {reportData.changeRequests.length} items</p>
          <p className="text-gray-700"><strong>Budget Items:</strong> {reportData.budget.length} items</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>Ready to submit:</strong> Click "Submit Report" below to finalize and submit your status report.
        </p>
      </div>
    </div>
  );
}
