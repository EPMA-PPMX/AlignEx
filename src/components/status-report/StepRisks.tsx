import { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

interface Risk {
  id: string;
  project_id: string;
  title: string;
  description: string;
  probability: string;
  impact: string;
  mitigation_plan: string;
  status: string;
}

export default function StepRisks({ reportData, updateReportData }: Props) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    probability: 'medium',
    impact: 'medium',
    mitigation_plan: '',
    status: 'open',
  });

  useEffect(() => {
    if (reportData.projectId) {
      loadProjectRisks();
    }
  }, [reportData.projectId]);

  const loadProjectRisks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*')
        .eq('project_id', reportData.projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error('Error loading risks:', error);
    }
  };

  const handleUpdateRisk = async (riskId: string, field: string, value: any) => {
    try {
      const { error } = await supabase
        .from('project_risks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', riskId);

      if (error) throw error;

      setRisks(risks.map(risk =>
        risk.id === riskId ? { ...risk, [field]: value } : risk
      ));
    } catch (error) {
      console.error('Error updating risk:', error);
      alert('Failed to update risk. Please try again.');
    }
  };

  const handleAddRisk = async () => {
    if (!newRisk.title.trim()) {
      alert('Please enter a risk title');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_risks')
        .insert({
          project_id: reportData.projectId,
          ...newRisk,
        })
        .select()
        .single();

      if (error) throw error;

      setRisks([data, ...risks]);
      setNewRisk({
        title: '',
        description: '',
        probability: 'medium',
        impact: 'medium',
        mitigation_plan: '',
        status: 'open',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding risk:', error);
      alert('Failed to add risk. Please try again.');
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!confirm('Are you sure you want to delete this risk?')) return;

    try {
      const { error } = await supabase
        .from('project_risks')
        .delete()
        .eq('id', riskId);

      if (error) throw error;
      setRisks(risks.filter(risk => risk.id !== riskId));
    } catch (error) {
      console.error('Error deleting risk:', error);
      alert('Failed to delete risk. Please try again.');
    }
  };

  const getProbabilityColor = (prob: string) => {
    switch (prob) {
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Risks</h2>
        <p className="text-gray-600">Review and update risks - changes are saved immediately</p>
      </div>

      <div className="space-y-4">
        {risks.map((risk) => (
          <div key={risk.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={risk.title}
                    onChange={(e) => handleUpdateRisk(risk.id, 'title', e.target.value)}
                    className="w-full font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 -ml-2"
                    placeholder="Risk title"
                  />
                </div>
                <button
                  onClick={() => handleDeleteRisk(risk.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <textarea
                value={risk.description || ''}
                onChange={(e) => handleUpdateRisk(risk.id, 'description', e.target.value)}
                className="w-full text-sm text-gray-600 border border-gray-200 rounded px-3 py-2 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={2}
                placeholder="Risk description"
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Probability</label>
                  <select
                    value={risk.probability}
                    onChange={(e) => handleUpdateRisk(risk.id, 'probability', e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded border font-medium ${getProbabilityColor(risk.probability)}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Impact</label>
                  <select
                    value={risk.impact}
                    onChange={(e) => handleUpdateRisk(risk.id, 'impact', e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded border font-medium ${getImpactColor(risk.impact)}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={risk.status}
                    onChange={(e) => handleUpdateRisk(risk.id, 'status', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded border border-gray-200 font-medium"
                  >
                    <option value="open">Open</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mitigation Plan</label>
                <textarea
                  value={risk.mitigation_plan || ''}
                  onChange={(e) => handleUpdateRisk(risk.id, 'mitigation_plan', e.target.value)}
                  className="w-full text-sm text-gray-600 border border-gray-200 rounded px-3 py-2 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={2}
                  placeholder="How will this risk be mitigated?"
                />
              </div>
            </div>
          </div>
        ))}

        {risks.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No risks found for this project</p>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
          >
            <Plus className="w-4 h-4" />
            Add New Risk
          </button>
        )}

        {showAddForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Add New Risk</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newRisk.title}
                onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter risk title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newRisk.description}
                onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the risk"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
                <select
                  value={newRisk.probability}
                  onChange={(e) => setNewRisk({ ...newRisk, probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                <select
                  value={newRisk.impact}
                  onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newRisk.status}
                  onChange={(e) => setNewRisk({ ...newRisk, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="open">Open</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Plan</label>
              <textarea
                value={newRisk.mitigation_plan}
                onChange={(e) => setNewRisk({ ...newRisk, mitigation_plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="How will this risk be mitigated?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddRisk}
                disabled={!newRisk.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Risk
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewRisk({
                    title: '',
                    description: '',
                    probability: 'medium',
                    impact: 'medium',
                    mitigation_plan: '',
                    status: 'open',
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
