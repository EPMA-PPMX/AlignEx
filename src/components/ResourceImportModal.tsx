import React, { useState, useEffect } from 'react';
import { Download, Upload, X, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  is_required: boolean;
}

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

export default function ResourceImportModal({ onClose, onImportComplete }: ImportModalProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    success: number;
    errors: string[];
    completed: boolean;
  } | null>(null);

  useEffect(() => {
    fetchCustomFields();
  }, []);

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

  const generateTemplate = () => {
    const standardHeaders = [
      'Resource Type',
      'First Name',
      'Last Name',
      'Email',
      'Resource Name',
      'Roles',
      'Cost Rate',
      'Rate Type',
      'Department',
      'Location',
      'Status',
      'Notes'
    ];

    const customFieldHeaders = customFields.map(field =>
      `CF: ${field.field_label}${field.is_required ? ' *' : ''}`
    );

    const headers = [...standardHeaders, ...customFieldHeaders];

    const sampleRow = [
      'person',
      'John',
      'Doe',
      'john.doe@example.com',
      '',
      'Developer, Team Lead',
      '75.00',
      'hourly',
      'Engineering',
      'New York',
      'active',
      'Senior developer with 5 years experience',
      ...customFields.map(() => '')
    ];

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      sampleRow.map(v => `"${v}"`).join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource_import_template_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportStatus(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim());
          if (currentRow.some(cell => cell)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = '';
        }
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell)) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const getColumnIndex = (name: string) => {
        const index = headers.findIndex(h =>
          h.toLowerCase().replace(/['"]/g, '').trim() === name.toLowerCase()
        );
        return index;
      };

      const customFieldMap = new Map<string, string>();
      headers.forEach((header, index) => {
        const match = header.match(/CF:\s*(.+?)(\s*\*)?$/i);
        if (match) {
          const fieldLabel = match[1].trim();
          const field = customFields.find(f =>
            f.field_label.toLowerCase() === fieldLabel.toLowerCase()
          );
          if (field) {
            customFieldMap.set(index.toString(), field.id);
          }
        }
      });

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        try {
          if (!row || row.every(cell => !cell)) {
            continue;
          }

          const resourceType = row[getColumnIndex('Resource Type')]?.toLowerCase();
          if (!resourceType || !['person', 'generic'].includes(resourceType)) {
            errors.push(`Row ${rowNum}: Invalid resource type. Must be 'person' or 'generic'`);
            continue;
          }

          const dataToInsert: any = {
            resource_type: resourceType,
            roles: row[getColumnIndex('Roles')]
              ?.split(',')
              .map(r => r.trim())
              .filter(Boolean) || [],
            cost_rate: row[getColumnIndex('Cost Rate')]
              ? parseFloat(row[getColumnIndex('Cost Rate')])
              : null,
            rate_type: row[getColumnIndex('Rate Type')] || 'hourly',
            department: row[getColumnIndex('Department')] || null,
            location: row[getColumnIndex('Location')] || null,
            status: row[getColumnIndex('Status')]?.toLowerCase() || 'active',
            notes: row[getColumnIndex('Notes')] || null,
            ad_synced: false,
          };

          if (resourceType === 'person') {
            const firstName = row[getColumnIndex('First Name')];
            const lastName = row[getColumnIndex('Last Name')];

            if (!firstName || !lastName) {
              errors.push(`Row ${rowNum}: First Name and Last Name are required for person resources`);
              continue;
            }

            dataToInsert.first_name = firstName;
            dataToInsert.last_name = lastName;
            dataToInsert.email = row[getColumnIndex('Email')] || null;
            dataToInsert.resource_name = null;
          } else {
            const resourceName = row[getColumnIndex('Resource Name')];

            if (!resourceName) {
              errors.push(`Row ${rowNum}: Resource Name is required for generic resources`);
              continue;
            }

            dataToInsert.resource_name = resourceName;
            dataToInsert.first_name = null;
            dataToInsert.last_name = null;
            dataToInsert.email = null;
          }

          const { data: insertedResource, error: insertError } = await supabase
            .from('resources')
            .insert([dataToInsert])
            .select()
            .single();

          if (insertError) {
            errors.push(`Row ${rowNum}: ${insertError.message}`);
            continue;
          }

          if (insertedResource && customFieldMap.size > 0) {
            const fieldValues: any[] = [];

            customFieldMap.forEach((fieldId, columnIndex) => {
              const value = row[parseInt(columnIndex)];
              if (value) {
                fieldValues.push({
                  resource_id: insertedResource.id,
                  field_id: fieldId,
                  value: value
                });
              }
            });

            if (fieldValues.length > 0) {
              const { error: fieldError } = await supabase
                .from('resource_field_values')
                .insert(fieldValues);

              if (fieldError) {
                console.error(`Row ${rowNum}: Error inserting custom field values:`, fieldError);
              }
            }
          }

          successCount++;
        } catch (rowError: any) {
          errors.push(`Row ${rowNum}: ${rowError.message}`);
        }
      }

      setImportStatus({
        success: successCount,
        errors,
        completed: true
      });

      if (successCount > 0) {
        onImportComplete();
      }
    } catch (error: any) {
      errors.push(`Import failed: ${error.message}`);
      setImportStatus({
        success: 0,
        errors,
        completed: true
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import Resources</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Import Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Download the CSV template below</li>
                  <li>Fill in your resource data (one resource per row)</li>
                  <li>Save the file and upload it using the upload button</li>
                  <li>Review any errors and fix them if needed</li>
                </ol>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Step 1: Download Template</h3>
            <button
              onClick={generateTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Template includes all standard fields{customFields.length > 0 && ' and custom fields'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Step 2: Upload Filled Template</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Select File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              {selectedFile && (
                <span className="text-sm text-gray-600">
                  {selectedFile.name}
                </span>
              )}
            </div>
          </div>

          {selectedFile && !importStatus && (
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Resources
                  </>
                )}
              </button>
            </div>
          )}

          {importStatus?.completed && (
            <div className="border rounded-lg overflow-hidden">
              <div className={`p-4 ${
                importStatus.errors.length === 0
                  ? 'bg-green-50 border-green-200'
                  : importStatus.success > 0
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    importStatus.errors.length === 0
                      ? 'text-green-600'
                      : importStatus.success > 0
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`} />
                  <div className="flex-1">
                    <p className={`font-medium ${
                      importStatus.errors.length === 0
                        ? 'text-green-900'
                        : importStatus.success > 0
                        ? 'text-yellow-900'
                        : 'text-red-900'
                    }`}>
                      Import {importStatus.errors.length === 0 ? 'Completed Successfully' : 'Completed with Issues'}
                    </p>
                    <p className="text-sm mt-1">
                      {importStatus.success} resource(s) imported successfully
                    </p>
                    {importStatus.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-2">Errors:</p>
                        <div className="bg-white rounded border border-gray-200 p-3 max-h-40 overflow-y-auto">
                          <ul className="text-sm space-y-1">
                            {importStatus.errors.map((error, idx) => (
                              <li key={idx} className="text-red-700">{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
