import { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, Download, Upload, Edit2, Trash2, UserPlus, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ResourceImportModal from '../components/ResourceImportModal';

interface Resource {
  id: string;
  resource_type: 'person' | 'generic';
  first_name?: string;
  last_name?: string;
  email?: string;
  resource_name?: string;
  display_name: string;
  roles: string[];
  cost_rate?: number;
  rate_type?: 'hourly' | 'daily' | 'monthly';
  status: 'active' | 'inactive';
  ad_synced: boolean;
  ad_user_id?: string;
  department?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'person' | 'generic'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter((resource) => {
    const matchesSearch = resource.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.department?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || resource.resource_type === filterType;
    const matchesStatus = filterStatus === 'all' || resource.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Type', 'First Name', 'Last Name', 'Email', 'Resource Name', 'Roles', 'Cost Rate', 'Rate Type', 'Department', 'Location', 'Status'];
    const rows = filteredResources.map(r => [
      r.resource_type,
      r.first_name || '',
      r.last_name || '',
      r.email || '',
      r.resource_name || '',
      r.roles.join(';'),
      r.cost_rate || '',
      r.rate_type || '',
      r.department || '',
      r.location || '',
      r.status
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resources_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-500 mt-1">Manage people and generic resources</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingResource(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="person">People</option>
              <option value="generic">Generic Resources</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No resources found. Add your first resource to get started.
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => (
                <tr key={resource.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {resource.resource_type === 'person' ? (
                        <Users className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Package className="w-4 h-4 text-green-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {resource.resource_type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{resource.display_name}</div>
                    {resource.ad_synced && (
                      <div className="text-xs text-blue-600">AD Synced</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{resource.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {resource.roles.length > 0 ? (
                        resource.roles.map((role, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {resource.cost_rate ? `$${resource.cost_rate}/${resource.rate_type}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{resource.department || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      resource.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {resource.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingResource(resource);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ResourceModal
          resource={editingResource}
          onClose={() => {
            setShowModal(false);
            setEditingResource(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingResource(null);
            fetchResources();
          }}
        />
      )}

      {showImportModal && (
        <ResourceImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            fetchResources();
          }}
        />
      )}
    </div>
  );
}

interface ResourceModalProps {
  resource: Resource | null;
  onClose: () => void;
  onSave: () => void;
}

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  field_description?: string;
  is_required: boolean;
  default_value?: string;
  options?: string[];
}

function ResourceModal({ resource, onClose, onSave }: ResourceModalProps) {
  const [formData, setFormData] = useState({
    resource_type: resource?.resource_type || 'person',
    first_name: resource?.first_name || '',
    last_name: resource?.last_name || '',
    email: resource?.email || '',
    resource_name: resource?.resource_name || '',
    roles: resource?.roles.join(', ') || '',
    cost_rate: resource?.cost_rate?.toString() || '',
    rate_type: resource?.rate_type || 'hourly',
    department: resource?.department || '',
    location: resource?.location || '',
    status: resource?.status || 'active',
    notes: resource?.notes || '',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomFields();
    if (resource) {
      fetchCustomFieldValues();
    }
  }, [resource]);

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('entity_type', 'resource')
        .order('created_at');

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const fetchCustomFieldValues = async () => {
    if (!resource) return;

    try {
      const { data, error } = await supabase
        .from('resource_field_values')
        .select('field_id, value')
        .eq('resource_id', resource.id);

      if (error) throw error;

      const values: Record<string, string> = {};
      data?.forEach((item) => {
        values[item.field_id] = item.value || '';
      });
      setCustomFieldValues(values);
    } catch (error) {
      console.error('Error fetching custom field values:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSave: any = {
        resource_type: formData.resource_type,
        roles: formData.roles.split(',').map(r => r.trim()).filter(Boolean),
        cost_rate: formData.cost_rate ? parseFloat(formData.cost_rate) : null,
        rate_type: formData.rate_type,
        department: formData.department || null,
        location: formData.location || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (formData.resource_type === 'person') {
        dataToSave.first_name = formData.first_name;
        dataToSave.last_name = formData.last_name;
        dataToSave.email = formData.email || null;
        dataToSave.resource_name = null;
      } else {
        dataToSave.resource_name = formData.resource_name;
        dataToSave.first_name = null;
        dataToSave.last_name = null;
        dataToSave.email = null;
      }

      let resourceId = resource?.id;

      if (resource) {
        const { error } = await supabase
          .from('resources')
          .update(dataToSave)
          .eq('id', resource.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('resources')
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;
        resourceId = data.id;
      }

      if (resourceId && customFields.length > 0) {
        const fieldValuePromises = Object.entries(customFieldValues).map(async ([fieldId, value]) => {
          const { error } = await supabase
            .from('resource_field_values')
            .upsert({
              resource_id: resourceId,
              field_id: fieldId,
              value: value || null,
            }, {
              onConflict: 'resource_id,field_id'
            });

          if (error) throw error;
        });

        await Promise.all(fieldValuePromises);
      }

      onSave();
    } catch (error) {
      console.error('Error saving resource:', error);
      alert('Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = customFieldValues[field.id] || field.default_value || '';

    switch (field.field_type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.field_type}
            value={value}
            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );

      case 'number':
      case 'cost':
        return (
          <input
            type="number"
            step={field.field_type === 'cost' ? '0.01' : 'any'}
            value={value}
            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={field.is_required}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <label key={idx} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                  className="mr-2"
                  required={field.is_required}
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.checked ? 'true' : 'false' })}
              className="mr-2"
            />
            {field.field_label}
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {resource ? 'Edit Resource' : 'Add New Resource'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resource Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.resource_type}
              onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="person">Person</option>
              <option value="generic">Generic Resource</option>
            </select>
          </div>

          {formData.resource_type === 'person' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.resource_name}
                onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                placeholder="e.g., Conference Room A, Projector, Laptop"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles / Skills
            </label>
            <input
              type="text"
              value={formData.roles}
              onChange={(e) => setFormData({ ...formData, roles: e.target.value })}
              placeholder="e.g., Project Manager, Developer (comma-separated)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple roles with commas</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Rate
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_rate}
                onChange={(e) => setFormData({ ...formData, cost_rate: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rate Type
              </label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({ ...formData, rate_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional information about this resource..."
            />
          </div>

          {customFields.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h3>
              <div className="space-y-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.field_label} {field.is_required && <span className="text-red-500">*</span>}
                    </label>
                    {field.field_description && (
                      <p className="text-xs text-gray-500 mb-2">{field.field_description}</p>
                    )}
                    {renderCustomField(field)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : resource ? 'Update Resource' : 'Create Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
