import BenefitTracking from '../BenefitTracking';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepBenefits({ reportData }: Props) {
  if (!reportData.projectId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Benefits Realization</h2>
          <p className="text-gray-600">Capture benefits realized for this project</p>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Please select a project first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Benefits Realization</h2>
        <p className="text-gray-600">Track and update benefits for this project</p>
      </div>
      <BenefitTracking projectId={reportData.projectId} />
    </div>
  );
}
