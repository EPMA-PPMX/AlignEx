import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  reportData: any;
  updateReportData: (field: string, value: any) => void;
}

export default function StepRisks({ reportData, updateReportData }: Props) {
  const [risks, setRisks] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    risk_id: null,
    title: '',
    description: '',
    probability: 'medium',
    impact: 'medium',
    mitigation_plan: '',
    status: 'open',
    is_new: true,
  });

  useEffect(() => {
    if (reportData.projectId) {
      loadProjectRisks();
    }
  }, [reportData.projectId]);

  useEffect(() => {
    if (reportData.risks.length > 0) {
      setRisks(reportData.risks);
    }
  }, []);

  const loadProjectRisks = async () => {
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*')
        .eq('project_id', reportData.projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const existingRisks = (data || []).map((risk) => ({
        risk_id: risk.id,
        title: risk.title,
        description: risk.description,
        probability: risk.probability,
        impact: risk.impact,
        mitigation_plan: risk.mitigation_plan,
        status: risk.status,
        is_new: false,
      }));

      setRisks(existingRisks);
      updateReportData('risks', existingRisks);
    } catch (error) {
      console.error('Error loading risks:', error);
    }
  };

  const handleAdd = () => {
    const newRisks = [...risks, formData];
    setRisks(newRisks);
    updateReportData('risks', newRisks);
    setFormData({
      risk_id: null,
      title: '',
      description: '',
      probability: 'medium',
      impact: 'medium',
      mitigation_plan: '',
      status: 'open',
      is_new: true,
    });
    setShowAddForm(false);
  };

  const handleEdit = (index: number) => {
    setFormData(risks[index]);
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleUpdate = () => {
    const newRisks = [...risks];
    newRisks[editingIndex!] = formData;
    setRisks(newRisks);
    updateReportData('risks', newRisks);
    setFormData({
      risk_id: null,
      title: '',
      description: '',
      probability: 'medium',
      impact: 'medium',
      mitigation_plan: '',
      status: 'open',
      is_new: true,
    });
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const newRisks = risks.filter((_, i) => i !== index);
    setRisks(newRisks);
    updateReportData('risks', newRisks);
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
        <p className="text-gray-600">Review and update risks for this week</p>
      </div>

      <div className="space-y-4">
        {risks.map((risk, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{risk.title}</h4>
                  {risk.is_new && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded border border-green-200">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3">{risk.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getProbabilityColor(risk.probability)}`}>
                    Probability: {risk.probability}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getImpactColor(risk.impact)}`}>
                    Impact: {risk.impact}
                  </span>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-200">
                    Status: {risk.status}
                  </span>
                </div>
                {risk.mitigation_plan && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Mitigation:</strong> {risk.mitigation_plan}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(index)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {risks.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No risks found for this project</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Risk
            </button>
          </div>
        )}

        {risks.length > 0 && !showAddForm && (
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
            <h3 className="font-semibold text-gray-900">
              {editingIndex !== null ? 'Edit Risk' : 'Add New Risk'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter risk title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the risk"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability</label>
                <select
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                <select
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                value={formData.mitigation_plan}
                onChange={(e) => setFormData({ ...formData, mitigation_plan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="How will this risk be mitigated?"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={editingIndex !== null ? handleUpdate : handleAdd}
                disabled={!formData.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingIndex !== null ? 'Update' : 'Add'} Risk
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingIndex(null);
                  setFormData({
                    risk_id: null,
                    title: '',
                    description: '',
                    probability: 'medium',
                    impact: 'medium',
                    mitigation_plan: '',
                    status: 'open',
                    is_new: true,
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
