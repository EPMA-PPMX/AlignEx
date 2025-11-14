import { Users } from 'lucide-react';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepTeam({ reportData, updateReportData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Availability</h2>
        <p className="text-gray-600">Capture out-of-office time for team members</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Team availability tracking coming soon</p>
      </div>
    </div>
  );
}
