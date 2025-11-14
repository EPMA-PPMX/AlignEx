import { TrendingUp } from 'lucide-react';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepBenefits({ reportData, updateReportData }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Benefits Realization</h2>
        <p className="text-gray-600">Capture benefits realized for this project</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Benefits tracking coming soon</p>
      </div>
    </div>
  );
}
