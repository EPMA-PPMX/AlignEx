import React, { useState, useEffect } from 'react';
import { Download, Upload, X, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ExcelJS from 'exceljs';

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  is_required: boolean;
  options?: string[];
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

  const getColumnLetter = (columnNumber: number): string => {
    let columnLetter = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      columnLetter = String.fromCharCode(65 + remainder) + columnLetter;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return columnLetter;
  };

  const generateTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resources');

    const standardHeaders = [
      { header: 'Resource Type', key: 'resource_type', width: 15 },
      { header: 'First Name', key: 'first_name', width: 15 },
      { header: 'Last Name', key: 'last_name', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Resource Name', key: 'resource_name', width: 20 },
      { header: 'Roles', key: 'roles', width: 25 },
      { header: 'Cost Rate', key: 'cost_rate', width: 12 },
      { header: 'Rate Type', key: 'rate_type', width: 12 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    const customFieldColumns = customFields.map(field => ({
      header: `CF: ${field.field_label}${field.is_required ? ' *' : ''}`,
      key: `cf_${field.id}`,
      width: 20
    }));

    worksheet.columns = [...standardHeaders, ...customFieldColumns];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const sampleRow = worksheet.addRow({
      resource_type: 'person',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      resource_name: '',
      roles: 'Developer, Team Lead',
      cost_rate: 75.00,
      rate_type: 'hourly',
      department: 'Engineering',
      location: 'New York',
      status: 'active',
      notes: 'Senior developer with 5 years experience'
    });

    const maxRows = 1000;

    for (let rowNum = 2; rowNum <= maxRows; rowNum++) {
      worksheet.getCell(`A${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"person,generic"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Resource Type',
        error: 'Please select either "person" or "generic"',
        showInputMessage: true,
        promptTitle: 'Resource Type',
        prompt: 'Select person or generic'
      };

      worksheet.getCell(`H${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"hourly,daily,monthly"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Rate Type',
        error: 'Please select hourly, daily, or monthly',
        showInputMessage: true,
        promptTitle: 'Rate Type',
        prompt: 'Select rate type'
      };

      worksheet.getCell(`K${rowNum}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"active,inactive"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select either active or inactive',
        showInputMessage: true,
        promptTitle: 'Status',
        prompt: 'Select status'
      };
    }

    customFields.forEach((field, index) => {
      if (field.field_type === 'dropdown' || field.field_type === 'radio') {
        if (field.options && field.options.length > 0) {
          const columnIndex = standardHeaders.length + index + 1;
          const columnLetter = getColumnLetter(columnIndex);
          const optionsList = field.options.join(',');

          for (let rowNum = 2; rowNum <= maxRows; rowNum++) {
            worksheet.getCell(`${columnLetter}${rowNum}`).dataValidation = {
              type: 'list',
              allowBlank: !field.is_required,
              formulae: [`"${optionsList}"`],
              showErrorMessage: true,
              errorTitle: `Invalid ${field.field_label}`,
              error: `Please select one of: ${field.options!.join(', ')}`,
              showInputMessage: true,
              promptTitle: field.field_label,
              prompt: `Select ${field.field_label}`
            };
          }
        }
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resource_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.xlsx')
    )) {
      setSelectedFile(file);
      setImportStatus(null);
    } else {
      alert('Please select a valid Excel file (.xlsx)');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet('Resources');
      if (!worksheet) {
        throw new Error('Could not find "Resources" worksheet in the Excel file');
      }

      const rows: any[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values = row.values as any[];
        rows.push(values.slice(1));
      });

      if (rows.length < 2) {
        throw new Error('Excel file must contain at least a header row and one data row');
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const getColumnIndex = (name: string) => {
        const index = headers.findIndex((h: any) => {
          if (!h) return false;
          const headerStr = String(h).toLowerCase().replace(/['"]/g, '').trim();
          return headerStr === name.toLowerCase();
        });
        return index;
      };

      const getCellValue = (row: any[], index: number): string => {
        if (index < 0 || index >= row.length) return '';
        const value = row[index];
        if (value === null || value === undefined) return '';
        return String(value).trim();
      };

      const customFieldMap = new Map<string, string>();
      headers.forEach((header: any, index: number) => {
        if (!header) return;
        const headerStr = String(header);
        const match = headerStr.match(/CF:\s*(.+?)(\s*\*)?$/i);
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
          if (!row || row.every((cell: any) => !cell)) {
            continue;
          }

          const resourceType = getCellValue(row, getColumnIndex('Resource Type')).toLowerCase();
          if (!resourceType || !['person', 'generic'].includes(resourceType)) {
            errors.push(`Row ${rowNum}: Invalid resource type. Must be 'person' or 'generic'`);
            continue;
          }

          const rolesValue = getCellValue(row, getColumnIndex('Roles'));
          const costRateValue = getCellValue(row, getColumnIndex('Cost Rate'));
          const rateTypeValue = getCellValue(row, getColumnIndex('Rate Type'));
          const statusValue = getCellValue(row, getColumnIndex('Status'));

          const dataToInsert: any = {
            resource_type: resourceType,
            roles: rolesValue
              ? rolesValue.split(',').map(r => r.trim()).filter(Boolean)
              : [],
            cost_rate: costRateValue ? parseFloat(costRateValue) : null,
            rate_type: rateTypeValue || 'hourly',
            department: getCellValue(row, getColumnIndex('Department')) || null,
            location: getCellValue(row, getColumnIndex('Location')) || null,
            status: statusValue.toLowerCase() || 'active',
            notes: getCellValue(row, getColumnIndex('Notes')) || null,
            ad_synced: false,
          };

          if (resourceType === 'person') {
            const firstName = getCellValue(row, getColumnIndex('First Name'));
            const lastName = getCellValue(row, getColumnIndex('Last Name'));

            if (!firstName || !lastName) {
              errors.push(`Row ${rowNum}: First Name and Last Name are required for person resources`);
              continue;
            }

            dataToInsert.first_name = firstName;
            dataToInsert.last_name = lastName;
            dataToInsert.email = getCellValue(row, getColumnIndex('Email')) || null;
            dataToInsert.resource_name = null;
          } else {
            const resourceName = getCellValue(row, getColumnIndex('Resource Name'));

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
              const value = getCellValue(row, parseInt(columnIndex));
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
                  <li>Download the Excel template below</li>
                  <li>Fill in your resource data (one resource per row)</li>
                  <li>Use the dropdown menus for fields with predefined values</li>
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
              Download Excel Template
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Template includes all standard fields{customFields.length > 0 && ' and custom fields'} with dropdown validations
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
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
