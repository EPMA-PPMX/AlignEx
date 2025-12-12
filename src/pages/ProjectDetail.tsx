import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard as Edit2, Trash2, Plus, Save, X, Calendar, User, AlertTriangle, FileText, Target, Activity, Users, Clock, Upload, Download, File, Eye, DollarSign, TrendingUp, Search, Group, Flag, ZoomIn, ZoomOut, Maximize2, Minimize2, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../lib/useNotification';
import { trackFieldHistory, shouldTrackFieldHistory } from '../lib/fieldHistoryTracker';
import { MonthlyBudgetGrid } from '../components/MonthlyBudgetGrid';
import { BudgetSummaryTiles } from '../components/BudgetSummaryTiles';
import Gantt from "../components/Gantt/Gantt";
import ProjectStatusDropdown from '../components/ProjectStatusDropdown';
import ProjectHealthStatus from '../components/ProjectHealthStatus';
import BenefitTracking from '../components/BenefitTracking';
import ProjectTeams from '../components/ProjectTeams';
import PeoplePicker from '../components/PeoplePicker';

interface Project {
  id: string;
  name: string;
  description?: string;
  start_date?: string | null;
  status: string;
  state: string;
  health_status: string;
  created_at: string;
  updated_at: string;
  template_id?: string;
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

interface SectionField {
  id: string;
  customFieldId: string;
  customField: CustomField;
  order: number;
}

interface Section {
  id: string;
  name: string;
  fields: SectionField[];
  isExpanded: boolean;
}

interface OverviewConfiguration {
  id: string;
  template_id: string;
  sections: Section[];
}

interface ProjectFieldValue {
  id: string;
  project_id: string;
  field_id: string;
  value: any;
}

interface Risk {
  id: string;
  project_id: string;
  title: string;
  owner?: string;
  assigned_to?: string;
  status: string;
  category?: string;
  probability?: number;
  impact?: string;
  cost?: number;
  description: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Issue {
  id: string;
  project_id: string;
  title: string;
  owner?: string;
  assigned_to?: string;
  status: string;
  category?: string;
  priority?: string;
  description: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

interface ChangeRequest {
  id: string;
  project_id: string;
  request_title: string;
  type: string;
  description: string;
  justification: string;
  scope_impact: string;
  cost_impact?: string;
  risk_impact: string;
  resource_impact: string;
  attachments?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectDocument {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

interface Budget {
  id: string;
  project_id: string;
  categories: string[];
  budget_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MonthlyBudgetForecast {
  id: string;
  project_id: string;
  category: string;
  month_year: string;
  forecasted_amount: number;
  actual_amount: number | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showConfirm, showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('overview');

  // Utility function to adjust date to skip weekends
  const adjustToWorkday = (dateString: string): string => {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();

    // If Saturday (6), move to Monday
    if (dayOfWeek === 6) {
      date.setDate(date.getDate() + 2);
    }
    // If Sunday (0), move to Monday
    else if (dayOfWeek === 0) {
      date.setDate(date.getDate() + 1);
    }

    // Format back to YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [project, setProject] = useState<Project | null>(null);
  const [overviewConfig, setOverviewConfig] = useState<OverviewConfiguration | null>(null);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: any }>({});
  const [risks, setRisks] = useState<Risk[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [monthlyForecasts, setMonthlyForecasts] = useState<MonthlyBudgetForecast[]>([]);
  const [costCategoryOptions, setCostCategoryOptions] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budgetViewFilter, setBudgetViewFilter] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isGroupedByOwner, setIsGroupedByOwner] = useState(false);
  const [isGanttFullscreen, setIsGanttFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFieldId, setHistoryFieldId] = useState<string | null>(null);
  const [historyFieldName, setHistoryFieldName] = useState<string>('');
  const [fieldHistory, setFieldHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form states for modals
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [showChangeRequestPreview, setShowChangeRequestPreview] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [editingChangeRequest, setEditingChangeRequest] = useState<ChangeRequest | null>(null);
  const [viewingChangeRequest, setViewingChangeRequest] = useState<ChangeRequest | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingProject, setEditingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    start_date: ''
  });

  const [riskForm, setRiskForm] = useState({
    title: '',
    owner: '',
    assigned_to: '',
    status: 'Active',
    category: 'Resource',
    probability: 50,
    impact: 'Medium',
    cost: 0,
    description: '',
    notes: ''
  });

  const [issueForm, setIssueForm] = useState({
    title: '',
    owner: '',
    assigned_to: '',
    status: 'Active',
    category: 'Resource',
    priority: 'Medium',
    description: '',
    resolution: ''
  });

  const [changeRequestForm, setChangeRequestForm] = useState({
    title: '',
    type: 'Scope Change',
    description: '',
    justification: '',
    scope_impact: 'Low',
    cost_impact: '',
    risk_impact: 'Low',
    resource_impact: 'Low',
    attachments: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    categories: [] as string[]
  });

  const [taskForm, setTaskForm] = useState({
    description: '',
    start_date: '',
    duration: 1,
    owner_id: '',
    resource_ids: [] as string[],
    parent_id: undefined as number | undefined,
    parent_wbs: '' as string,
    successor_ids: [] as number[],
    type: 'task' as string,
    progress: 0
  });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  const [projectTeamMembers, setProjectTeamMembers] = useState<any[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    fileName: string;
    path: string;
    fileSize: number;
    mimeType: string;
  }>>([]);

  const [projectTasks, setProjectTasks] = useState<any>({
    data: [],
    links: []
  });

  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const ganttRef = useRef<any>(null);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Target },
    { id: 'timeline', name: 'Timeline', icon: Calendar },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'risks-issues', name: 'Risks & Issues', icon: AlertTriangle },
    { id: 'change-management', name: 'Change Management', icon: FileText },
    { id: 'budget', name: 'Budget', icon: DollarSign },
    { id: 'benefit-tracking', name: 'Benefit Tracking', icon: TrendingUp },
    { id: 'settings', name: 'Documents', icon: FileText },
  ];

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchRisks();
      fetchIssues();
      fetchChangeRequests();
      fetchDocuments();
      fetchBudgets();
      fetchCostCategoryOptions();
      fetchMonthlyForecasts();
      fetchProjectTasks();
      fetchProjectTeamMembers();
    }
  }, [id]);

  useEffect(() => {
    if (project?.template_id) {
      fetchOverviewConfiguration();
      fetchFieldValues();
    }
  }, [project]);

  useEffect(() => {
    fetchMonthlyForecasts();
  }, [selectedYear, id]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching project:', error);
      } else {
        setProject(data);
        if (data) {
          setProjectForm({
            name: data.name || '',
            description: data.description || '',
            start_date: data.start_date || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewConfiguration = async () => {
    if (!project?.template_id) return;

    try {
      const { data, error } = await supabase
        .from('overview_configurations')
        .select('*')
        .eq('template_id', project.template_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching overview configuration:', error);
      } else if (data) {
        // Fetch current custom field data to get track_history flag
        const fieldIds = data.sections.flatMap((section: any) =>
          section.fields.map((f: any) => f.customField.id)
        );

        if (fieldIds.length > 0) {
          const { data: customFieldsData, error: fieldsError } = await supabase
            .from('custom_fields')
            .select('id, track_history')
            .in('id', fieldIds);

          if (!fieldsError && customFieldsData) {
            // Update the sections with current track_history values
            const fieldTrackingMap = new Map(
              customFieldsData.map(cf => [cf.id, cf.track_history])
            );

            const updatedSections = data.sections.map((section: any) => ({
              ...section,
              fields: section.fields.map((field: any) => ({
                ...field,
                customField: {
                  ...field.customField,
                  track_history: fieldTrackingMap.get(field.customField.id) || false
                }
              }))
            }));

            setOverviewConfig({ ...data, sections: updatedSections });
          } else {
            setOverviewConfig(data);
          }
        } else {
          setOverviewConfig(data);
        }
      }
    } catch (error) {
      console.error('Error fetching overview configuration:', error);
    }
  };

  const fetchFieldValues = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('project_field_values')
        .select('*')
        .eq('project_id', id);

      if (error) {
        console.error('Error fetching field values:', error);
      } else if (data) {
        const values: { [key: string]: any } = {};
        data.forEach((item: ProjectFieldValue) => {
          values[item.field_id] = item.value;
        });
        setFieldValues(values);
      }
    } catch (error) {
      console.error('Error fetching field values:', error);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
      } else {
        setDocuments(data || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchBudgets = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching budgets:', error);
      } else {
        setBudgets(data || []);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const fetchMonthlyForecasts = async () => {
    if (!id) return;
    try {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data, error } = await supabase
        .from('budget_forecast_monthly')
        .select('*')
        .eq('project_id', id)
        .gte('month_year', startDate)
        .lte('month_year', endDate)
        .order('category', { ascending: true })
        .order('month_year', { ascending: true });

      if (error) {
        console.error('Error fetching monthly forecasts:', error);
      } else {
        setMonthlyForecasts(data || []);
      }
    } catch (error) {
      console.error('Error fetching monthly forecasts:', error);
    }
  };

  const fetchRisks = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_risks')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching risks:', error);
      } else {
        setRisks(data || []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
    }
  };

  const fetchIssues = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('project_issues')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching issues:', error);
      } else {
        setIssues(data || []);
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    }
  };

  const fetchChangeRequests = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching change requests:', error);
      } else {
        setChangeRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching change requests:', error);
    }
  };

  const fetchCostCategoryOptions = async () => {
    try {
      console.log('Fetching budget categories...');
      const { data, error } = await supabase
        .from('budget_categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching budget categories:', error);
        setCostCategoryOptions([]);
        return;
      }

      console.log('Budget categories fetched:', data);

      if (data && data.length > 0) {
        const categoryNames = data.map(cat => cat.name);
        console.log('Setting category options:', categoryNames);
        setCostCategoryOptions(categoryNames);
      } else {
        console.log('No budget categories found');
        setCostCategoryOptions([]);
      }
    } catch (error) {
      console.error('Error fetching budget categories:', error);
      setCostCategoryOptions([]);
    }
  };

  const fetchProjectTasks = async () => {
    try {
      console.log('fetchProjectTasks called for project:', id);

      // Get the most recent record for this project
      const { data: records, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      const data = records && records.length > 0 ? records[0] : null;

      console.log('Fetched project_tasks records:', records);
      console.log('Selected record:', data);

      if (error) {
        console.error('Error fetching project tasks:', error);
      } else if (data && data.task_data) {
        // Normalize date formats for dhtmlx-gantt and clean data
        const taskData = data.task_data;
        if (taskData.data && Array.isArray(taskData.data)) {
          taskData.data = taskData.data.map((task: any) => {
            // Only keep essential fields and ensure proper date format
            let startDate = task.start_date;

            // Handle different date formats
            if (startDate) {
              // Convert to string if it's not already
              startDate = String(startDate);

              // If date contains 'T' or 'Z', extract just the date part
              if (startDate.includes('T') || startDate.includes('Z')) {
                startDate = startDate.split('T')[0];
              }
              // Ensure it has time component
              if (!startDate.includes(':')) {
                startDate = `${startDate} 00:00`;
              }
            } else {
              // If no start date, use today
              const today = new Date();
              startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00`;
              console.warn(`Task ${task.id} missing start_date, using today`);
            }

            return {
              id: task.id,
              text: task.text || 'Untitled Task',
              start_date: startDate,
              duration: task.duration || 1,
              progress: task.progress || 0,
              type: task.type || 'task',
              parent: task.parent !== undefined && task.parent !== null ? task.parent : 0,
              owner_id: task.owner_id,
              owner_name: task.owner_name,
              resource_ids: task.resource_ids || [],
              resource_names: task.resource_names || []
            };
          });
        }
        console.log('Setting project tasks with data:', taskData.data?.length, 'tasks');
        setProjectTasks({
          data: taskData.data || [],
          links: taskData.links || [],
          baseline: taskData.baseline || []
        });
        // Reset grouping state when new data is loaded
        setIsGroupedByOwner(false);
      } else {
        console.log('No task data found for project, setting empty array');
        setProjectTasks({ data: [], links: [] });
        setIsGroupedByOwner(false);
      }
    } catch (error) {
      console.error('Error fetching project tasks:', error);
      setProjectTasks({ data: [], links: [] });
      setIsGroupedByOwner(false);
    }
  };

  const fetchProjectTeamMembers = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('project_team_members')
        .select(`
          id,
          resource_id,
          resources (
            id,
            display_name
          )
        `)
        .eq('project_id', id);

      if (error) {
        console.error('Error fetching project team members:', error);
      } else {
        setProjectTeamMembers(data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const saveProjectTasks = async () => {
    if (!id) return;

    try {
      console.log("saveProjectTasks called");

      // Get current data from Gantt chart
      const ganttInstance = (window as any).gantt;
      if (!ganttInstance) {
        console.error("Gantt instance not found");
        return;
      }

      const currentTasks = ganttInstance.serialize();
      console.log("Current tasks from Gantt:", currentTasks);

      // Clean the data before saving - filter out group headers and deduplicate
      const taskMap = new Map();
      currentTasks.data
        .filter((task: any) => !task.$group_header) // Exclude group headers
        .forEach((task: any) => {
          const taskId = task.$original_id || task.id;
          // Only add if not already in map (handles duplicates from grouping)
          if (!taskMap.has(taskId)) {
            taskMap.set(taskId, {
              id: taskId,
              text: task.text,
              start_date: task.start_date,
              duration: task.duration,
              progress: task.progress || 0,
              type: task.type || 'task',
              parent: task.$original_parent !== undefined ? task.$original_parent : (task.parent || 0),
              owner_id: task.owner_id,
              owner_name: task.owner_name,
              resource_ids: task.resource_ids || [],
              resource_names: task.resource_names || []
            });
          }
        });

      const cleanedData = {
        data: Array.from(taskMap.values()),
        links: (currentTasks.links || []).map((link: any) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type
        }))
      };

      console.log("Cleaned data:", cleanedData);

      // Check if project_tasks record exists (get the most recent one)
      const { data: existingData } = await supabase
        .from('project_tasks')
        .select('id')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingData && existingData.length > 0) {
        // Update the most recent record
        console.log("Updating existing record:", existingData[0].id);
        const { error } = await supabase
          .from('project_tasks')
          .update({
            task_data: cleanedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);

        if (error) {
          console.error('Error updating tasks:', error);
        } else {
          console.log("Tasks updated successfully");
        }
      } else {
        // Insert new record only if none exists
        console.log("Inserting new record");
        const { error } = await supabase
          .from('project_tasks')
          .insert({
            project_id: id,
            task_data: cleanedData
          });

        if (error) {
          console.error('Error inserting tasks:', error);
        } else {
          console.log("Tasks inserted successfully");
        }
      }
    } catch (error) {
      console.error('Error saving project tasks:', error);
    }
  };

  const saveFieldValues = async () => {
    if (!id) return;

    try {
      setSaving(true);

      // Convert fieldValues object to array of records
      const records = Object.entries(fieldValues).map(([fieldId, value]) => ({
        project_id: id,
        field_id: fieldId,
        value: value
      }));

      if (records.length === 0) {
        showNotification('No field values to save', 'info');
        return;
      }

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('project_field_values')
        .upsert(records, {
          onConflict: 'project_id, field_id'
        })
        .select();

      if (error) {
        console.error('Error saving field values:', error);
        showNotification(`Error saving field values: ${error.message}`, 'error');
      } else {
        showNotification('Field values saved successfully!', 'success');

        // Track history for fields that have history tracking enabled
        if (overviewConfig && project) {
          for (const [fieldId, value] of Object.entries(fieldValues)) {
            const shouldTrack = await shouldTrackFieldHistory(fieldId);
            if (shouldTrack) {
              // Find the field in the overview config sections
              let field = null;
              for (const section of overviewConfig.sections) {
                const foundField = section.fields.find(f => f.customField.id === fieldId);
                if (foundField) {
                  field = foundField.customField;
                  break;
                }
              }

              if (field) {
                await trackFieldHistory({
                  projectId: id,
                  fieldId: fieldId,
                  fieldValue: String(value),
                  projectName: project.name,
                  fieldName: field.field_label
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving field values:', error);
      showNotification(`Unexpected error saving field values: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const loadFieldHistory = async (fieldId: string, fieldName: string) => {
    if (!id) return;

    try {
      setLoadingHistory(true);
      setHistoryFieldId(fieldId);
      setHistoryFieldName(fieldName);
      setShowHistoryModal(true);

      const { data, error } = await supabase
        .from('project_field_value_history')
        .select('*')
        .eq('project_id', id)
        .eq('field_id', fieldId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setFieldHistory(data || []);
    } catch (error) {
      console.error('Error loading field history:', error);
      showNotification('Failed to load field history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFieldValueChange = (fieldId: string, value: any, fieldType?: string) => {
    // Validate cost field type - only allow decimal numbers
    if (fieldType === 'cost') {
      // Allow empty string for clearing the field
      if (value === '') {
        setFieldValues(prev => ({
          ...prev,
          [fieldId]: value
        }));
        return;
      }

      // Validate decimal number format
      const costRegex = /^\d*\.?\d*$/;
      if (!costRegex.test(value)) {
        // Don't update if invalid
        return;
      }
    }

    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const renderFieldControl = (field: SectionField) => {
    const { customField } = field;
    const value = fieldValues[customField.id] || customField.default_value || '';
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

    switch (customField.field_type) {
      case 'text':
      case 'email':
        return (
          <input
            type={customField.field_type}
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value, customField.field_type)}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            required={customField.is_required}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value, customField.field_type)}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            required={customField.is_required}
          />
        );
      case 'cost':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value, 'cost')}
            placeholder={customField.default_value || "0.00"}
            className={baseClasses}
            required={customField.is_required}
            pattern="^\d*\.?\d*$"
            title="Please enter a valid decimal number (e.g., 1000.50)"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value)}
            className={baseClasses}
            required={customField.is_required}
          />
        );
      case 'textarea':
        return (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value)}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={`${baseClasses} resize-vertical`}
            required={customField.is_required}
          />
        );
      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value)}
            className={baseClasses}
            required={customField.is_required}
          >
            <option value="">Select {customField.field_label.toLowerCase()}</option>
            {customField.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {customField.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`radio-${field.id}`}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleFieldValueChange(customField.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                  required={customField.is_required}
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleFieldValueChange(customField.id, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required={customField.is_required}
            />
            <span className="text-sm text-gray-700">{customField.field_label}</span>
          </label>
        );
      case 'people_picker':
        return (
          <PeoplePicker
            value={value}
            onChange={(resourceId, displayName) => {
              handleFieldValueChange(customField.id, resourceId, 'people_picker');
            }}
            placeholder={`Select ${customField.field_label.toLowerCase()}`}
            disabled={false}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldValueChange(customField.id, e.target.value)}
            placeholder={customField.default_value || `Enter ${customField.field_label.toLowerCase()}`}
            className={baseClasses}
            required={customField.is_required}
          />
        );
    }
  };

  // Project update operations
  const startEditingProject = () => {
    setEditingProject(true);
    setProjectForm({
      name: project?.name || '',
      description: project?.description || '',
      start_date: project?.start_date || ''
    });
  };

  const cancelEditingProject = () => {
    setEditingProject(false);
    setProjectForm({
      name: project?.name || '',
      description: project?.description || '',
      start_date: project?.start_date || ''
    });
  };

  const handleProjectUpdate = async () => {
    if (!id || !projectForm.name.trim()) {
      showNotification('Project name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('projects')
        .update({
          name: projectForm.name.trim(),
          description: projectForm.description.trim(),
          start_date: projectForm.start_date || null
        })
        .eq('id', id);

      if (error) {
        showNotification(`Error: ${error.message}`, 'error');
      } else {
        setProject(prev => prev ? {
          ...prev,
          name: projectForm.name.trim(),
          description: projectForm.description.trim(),
          start_date: projectForm.start_date || null
        } : null);
        setEditingProject(false);
        showNotification('Project updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      showNotification('Error updating project. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Risk CRUD operations
  const handleRiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const payload = {
        ...riskForm,
        project_id: id
      };

      if (editingRisk) {
        const { error } = await supabase
          .from('project_risks')
          .update(riskForm)
          .eq('id', editingRisk.id);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchRisks();
          setShowRiskModal(false);
          resetRiskForm();
          showNotification('Risk updated successfully!', 'success');
        }
      } else {
        const { error } = await supabase
          .from('project_risks')
          .insert([payload]);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchRisks();
          setShowRiskModal(false);
          resetRiskForm();
          showNotification('Risk created successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Error saving risk:', error);
      showNotification('Error saving risk', 'error');
    }
  };

  const handleEditRisk = (risk: Risk) => {
    setEditingRisk(risk);
    setRiskForm({
      title: risk.title,
      owner: risk.owner || '',
      assigned_to: risk.assigned_to || '',
      status: risk.status,
      category: risk.category || 'Resource',
      probability: risk.probability || 50,
      impact: risk.impact || 'Medium',
      cost: risk.cost || 0,
      description: risk.description,
      notes: risk.notes || ''
    });
    setShowRiskModal(true);
  };

  const handleDeleteRisk = async (riskId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Risk',
      message: 'Are you sure you want to delete this risk?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_risks')
        .delete()
        .eq('id', riskId);

      if (error) {
        showNotification(`Error: ${error.message}`, 'error');
      } else {
        await fetchRisks();
        showNotification('Risk deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting risk:', error);
      showNotification('Error deleting risk', 'error');
    }
  };

  const resetRiskForm = () => {
    setRiskForm({
      title: '',
      owner: '',
      assigned_to: '',
      status: 'Active',
      category: 'Resource',
      probability: 50,
      impact: 'Medium',
      cost: 0,
      description: '',
      notes: ''
    });
    setEditingRisk(null);
  };

  // Issue CRUD operations
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const payload = {
        ...issueForm,
        project_id: id
      };

      if (editingIssue) {
        const { error } = await supabase
          .from('project_issues')
          .update(issueForm)
          .eq('id', editingIssue.id);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchIssues();
          setShowIssueModal(false);
          resetIssueForm();
          showNotification('Issue updated successfully!', 'success');
        }
      } else {
        const { error } = await supabase
          .from('project_issues')
          .insert([payload]);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchIssues();
          setShowIssueModal(false);
          resetIssueForm();
          showNotification('Issue created successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Error saving issue:', error);
      showNotification('Error saving issue', 'error');
    }
  };

  const handleEditIssue = (issue: Issue) => {
    setEditingIssue(issue);
    setIssueForm({
      title: issue.title,
      owner: issue.owner || '',
      assigned_to: issue.assigned_to || '',
      status: issue.status,
      category: issue.category || 'Resource',
      priority: issue.priority || 'Medium',
      description: issue.description,
      resolution: issue.resolution || ''
    });
    setShowIssueModal(true);
  };

  const handleDeleteIssue = async (issueId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Issue',
      message: 'Are you sure you want to delete this issue?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_issues')
        .delete()
        .eq('id', issueId);

      if (error) {
        showNotification(`Error: ${error.message}`, 'error');
      } else {
        await fetchIssues();
        showNotification('Issue deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting issue:', error);
      showNotification('Error deleting issue', 'error');
    }
  };

  const resetIssueForm = () => {
    setIssueForm({
      title: '',
      owner: '',
      assigned_to: '',
      status: 'Active',
      category: 'Resource',
      priority: 'Medium',
      description: '',
      resolution: ''
    });
    setEditingIssue(null);
  };

  // Change Request CRUD operations
  const handleChangeRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const attachmentsData = JSON.stringify(uploadedFiles);
      const { title, ...restForm } = changeRequestForm;
      const payload = {
        ...restForm,
        request_title: title,
        attachments: attachmentsData,
        project_id: id
      };

      if (editingChangeRequest) {
        const { title, ...restForm } = changeRequestForm;
        const { error } = await supabase
          .from('change_requests')
          .update({
            ...restForm,
            request_title: title,
            attachments: attachmentsData
          })
          .eq('id', editingChangeRequest.id);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchChangeRequests();
          setShowChangeRequestModal(false);
          resetChangeRequestForm();
          showNotification('Change request updated successfully!', 'success');
        }
      } else {
        const { error } = await supabase
          .from('change_requests')
          .insert([payload]);

        if (error) {
          showNotification(`Error: ${error.message}`, 'error');
        } else {
          await fetchChangeRequests();
          setShowChangeRequestModal(false);
          resetChangeRequestForm();
          showNotification('Change request created successfully!', 'success');
        }
      }
    } catch (error) {
      console.error('Error saving change request:', error);
      showNotification('Error saving change request', 'error');
    }
  };

  const handleViewChangeRequest = (changeRequest: ChangeRequest) => {
    setViewingChangeRequest(changeRequest);
    setShowChangeRequestPreview(true);
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('change-request-attachments')
        .download(filePath);

      if (error) {
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Failed to download file. Please try again.', 'error');
    }
  };

  const handleEditChangeRequest = (changeRequest: ChangeRequest) => {
    setEditingChangeRequest(changeRequest);
    setChangeRequestForm({
      title: changeRequest.request_title,
      type: changeRequest.type,
      description: changeRequest.description,
      justification: changeRequest.justification,
      scope_impact: changeRequest.scope_impact,
      cost_impact: changeRequest.cost_impact || '',
      risk_impact: changeRequest.risk_impact,
      resource_impact: changeRequest.resource_impact,
      attachments: changeRequest.attachments || ''
    });

    try {
      if (changeRequest.attachments && changeRequest.attachments.trim() !== '') {
        const parsedAttachments = JSON.parse(changeRequest.attachments);
        if (Array.isArray(parsedAttachments)) {
          setUploadedFiles(parsedAttachments);
        }
      } else {
        setUploadedFiles([]);
      }
    } catch (e) {
      setUploadedFiles([]);
    }

    setShowChangeRequestModal(true);
  };

  const handleDeleteChangeRequest = async (changeRequestId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Change Request',
      message: 'Are you sure you want to delete this change request?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('change_requests')
        .delete()
        .eq('id', changeRequestId);

      if (error) {
        showNotification(`Error: ${error.message}`, 'error');
      } else {
        await fetchChangeRequests();
        showNotification('Change request deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting change request:', error);
      showNotification('Error deleting change request', 'error');
    }
  };

  const resetChangeRequestForm = () => {
    setChangeRequestForm({
      title: '',
      type: 'Scope Change',
      description: '',
      justification: '',
      scope_impact: 'Low',
      cost_impact: '',
      risk_impact: 'Low',
      resource_impact: 'Low',
      attachments: ''
    });
    setUploadedFiles([]);
    setEditingChangeRequest(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('change-request-attachments')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(uploadError.message || 'Upload failed');
        }

        return {
          fileName: file.name,
          path: filePath,
          fileSize: file.size,
          mimeType: file.type
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results]);
      showNotification(`${files.length} file(s) uploaded successfully!`, 'success');
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading files:', error);
      showNotification(error.message || 'Error uploading files', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('change-request-attachments')
        .download(filePath);

      if (error) {
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      showNotification('Error downloading file', 'error');
    }
  };

  const handleRemoveFile = async (filePath: string) => {
    const confirmed = await showConfirm({
      title: 'Delete File',
      message: 'Are you sure you want to delete this file?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.storage
        .from('change-request-attachments')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      setUploadedFiles(prev => prev.filter(f => f.path !== filePath));
      showNotification('File deleted successfully', 'success');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      showNotification(`Error deleting file: ${error.message}`, 'error');
    }
  };

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase
        .from('project_documents')
        .insert([{
          project_id: id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type
        }]);

      if (insertError) {
        await supabase.storage
          .from('project-documents')
          .remove([filePath]);
        throw insertError;
      }

      await fetchDocuments();
      showNotification('Document uploaded successfully!', 'success');
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading document:', error);
      showNotification(`Error uploading document: ${error.message}`, 'error');
    }
  };

  const handleDownloadDocument = async (doc: ProjectDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.file_path);

      if (error) {
        throw error;
      }

      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      showNotification(`Error downloading document: ${error.message}`, 'error');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document?',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const doc = documents.find(d => d.id === documentId);
      if (!doc) {
        showNotification('Document not found', 'error');
        return;
      }

      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .remove([doc.file_path]);

      if (storageError) {
        console.error('Storage error:', storageError);
      }

      const { error: dbError } = await supabase
        .from('project_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      setDocuments(prevDocs => prevDocs.filter(d => d.id !== documentId));
      showNotification('Document deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      showNotification(`Error deleting document: ${error.message}`, 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Helper function to get all tasks with their WBS codes
  const getAllTasksWithWBS = () => {
    const tasksWithWBS: Array<{ id: number; text: string; wbs: string }> = [];

    if (projectTasks && projectTasks.data && Array.isArray(projectTasks.data)) {
      projectTasks.data.forEach((task: any) => {
        // Skip group headers
        if (!task.$group_header) {
          const wbs = (window as any).gantt?.getWBSCode?.(task) || '';
          tasksWithWBS.push({
            id: task.id,
            text: task.text || 'Untitled Task',
            wbs: wbs
          });
        }
      });
    }

    return tasksWithWBS;
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== Task Submit Started ===');
    console.log('taskForm:', taskForm);
    console.log('editingTaskId:', editingTaskId);

    if (!taskForm.description || !taskForm.start_date || !taskForm.duration) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      let updatedTaskData;
      let currentTaskId = editingTaskId; // Track the task ID being worked with

      // Adjust start date to skip weekends
      const adjustedStartDate = adjustToWorkday(taskForm.start_date);
      console.log('Adjusted start date:', adjustedStartDate);

      if (editingTaskId) {
        // Update existing task
        const existingLinks = projectTasks.links || [];

        // Remove old links where this task is the source
        const filteredLinks = existingLinks.filter((link: any) => link.source !== editingTaskId);

        // Create new links for successor tasks
        const newLinks = taskForm.successor_ids.map((successorId, index) => ({
          id: Date.now() + index,
          source: editingTaskId,
          target: successorId,
          type: "0" // Finish-to-Start dependency
        }));

        updatedTaskData = {
          data: projectTasks.data.map((task: any) => {
            if (task.id === editingTaskId) {
              const updatedTask: any = {
                ...task,
                text: taskForm.description,
                start_date: `${adjustedStartDate} 00:00`,
                duration: taskForm.type === 'milestone' ? 0 : taskForm.duration,
                type: taskForm.type,
                progress: taskForm.type === 'milestone' ? 0 : (taskForm.progress / 100)
              };

              // Update resources if selected
              if (taskForm.resource_ids.length > 0) {
                updatedTask.resource_ids = taskForm.resource_ids;
                const resourceNames = taskForm.resource_ids.map(resId => {
                  const member = projectTeamMembers.find((m: any) => m.resource_id === resId);
                  return member?.resources?.display_name || 'Unknown';
                });
                updatedTask.resource_names = resourceNames;
                // Backward compatibility: set first resource as owner
                updatedTask.owner_id = taskForm.resource_ids[0];
                updatedTask.owner_name = resourceNames[0];
              } else {
                updatedTask.resource_ids = [];
                updatedTask.resource_names = [];
                updatedTask.owner_id = undefined;
                updatedTask.owner_name = undefined;
              }

              return updatedTask;
            }
            return task;
          }),
          links: [...filteredLinks, ...newLinks]
        };
      } else {
        // Create new task
        const newTaskId = projectTasks.data.length > 0
          ? Math.max(...projectTasks.data.map((t: any) => t.id)) + 1
          : 1;

        const newTask: any = {
          id: newTaskId,
          text: taskForm.description,
          start_date: `${adjustedStartDate} 00:00`,
          duration: taskForm.type === 'milestone' ? 0 : taskForm.duration,
          type: taskForm.type,
          progress: taskForm.type === 'milestone' ? 0 : (taskForm.progress / 100)
        };

        // Set parent - MUST be 0 for root tasks, not undefined
        console.log('Checking parent_id:', taskForm.parent_id);
        console.log('parent_id type:', typeof taskForm.parent_id);
        if (taskForm.parent_id !== undefined && taskForm.parent_id !== null) {
          newTask.parent = taskForm.parent_id;
          console.log('Setting parent to:', taskForm.parent_id);
        } else {
          newTask.parent = 0; // Explicitly set to 0 for root tasks
          console.log('No parent_id - creating as root task with parent = 0');
        }
        console.log('New task object:', newTask);

        // Add resources if selected
        if (taskForm.resource_ids.length > 0) {
          newTask.resource_ids = taskForm.resource_ids;
          const resourceNames = taskForm.resource_ids.map(resId => {
            const member = projectTeamMembers.find((m: any) => m.resource_id === resId);
            return member?.resources?.display_name || 'Unknown';
          });
          newTask.resource_names = resourceNames;
          // Backward compatibility: set first resource as owner
          newTask.owner_id = taskForm.resource_ids[0];
          newTask.owner_name = resourceNames[0];
        }

        // Add to existing tasks
        const existingLinks = projectTasks.links || [];

        // Create links for successor tasks
        const newLinks = taskForm.successor_ids.map((successorId, index) => ({
          id: Date.now() + index,
          source: newTask.id,
          target: successorId,
          type: "0" // Finish-to-Start dependency
        }));

        updatedTaskData = {
          data: [...projectTasks.data, newTask],
          links: [...existingLinks, ...newLinks]
        };

        // Store the new task ID for later use
        currentTaskId = newTask.id;
      }

      // Check if project_tasks record exists (get the most recent one)
      const { data: existingData, error: fetchError } = await supabase
        .from('project_tasks')
        .select('id')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingData && existingData.length > 0) {
        // Update the most recent record
        const { error } = await supabase
          .from('project_tasks')
          .update({
            task_data: updatedTaskData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData[0].id);

        if (error) throw error;
      } else {
        // Insert new record only if none exists
        const { error } = await supabase
          .from('project_tasks')
          .insert({
            project_id: id,
            task_data: updatedTaskData
          });

        if (error) throw error;
      }

      // Save resource assignments to junction table
      if (taskForm.resource_ids.length > 0 && currentTaskId) {
        // First, get the actual database task ID by finding it in task_data
        const { data: taskRecord } = await supabase
          .from('project_tasks')
          .select('id, task_data')
          .eq('project_id', id)
          .maybeSingle();

        if (taskRecord?.id) {
          // Delete existing assignments for this task
          await supabase
            .from('task_resource_assignments')
            .delete()
            .eq('task_id', taskRecord.id);

          // Insert new assignments
          const assignments = taskForm.resource_ids.map(resourceId => ({
            task_id: taskRecord.id,
            resource_id: resourceId
          }));

          const { error: assignmentError } = await supabase
            .from('task_resource_assignments')
            .insert(assignments);

          if (assignmentError) {
            console.error('Error saving resource assignments:', assignmentError);
          }
        }
      }

      // Update local state
      setProjectTasks(updatedTaskData);
      // Reset grouping state when tasks are updated
      setIsGroupedByOwner(false);

      showNotification(editingTaskId ? 'Task updated successfully!' : 'Task created successfully!', 'success');
      setShowTaskModal(false);
      setEditingTaskId(null);
      setTaskForm({
        description: '',
        start_date: '',
        duration: 1,
        owner_id: '',
        resource_ids: [],
        parent_id: undefined,
        successor_ids: [],
        type: 'task',
        progress: 0
      });
    } catch (error: any) {
      console.error('Error creating task:', error);
      showNotification(`Error creating task: ${error.message}`, 'error');
    }
  };

  const getCostCategoryOptions = (): string[] => {
    console.log('getCostCategoryOptions called, current options:', costCategoryOptions);
    return costCategoryOptions;
  };

  const handleAddBudget = () => {
    setBudgetForm({
      categories: []
    });
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setBudgetForm({
      categories: budget.categories || []
    });
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleCategoryToggle = (category: string) => {
    setBudgetForm(prev => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  };

  const handleSaveBudget = async () => {
    if (!id) return;

    try {
      if (editingBudget) {
        const { error } = await supabase
          .from('project_budgets')
          .update({
            categories: budgetForm.categories,
            budget_amount: 0
          })
          .eq('id', editingBudget.id);

        if (error) {
          throw error;
        }

        const oldCategories = editingBudget.categories || [];
        const newCategories = budgetForm.categories;
        const removedCategories = oldCategories.filter(c => !newCategories.includes(c));
        const addedCategories = newCategories.filter(c => !oldCategories.includes(c));

        if (removedCategories.length > 0) {
          await supabase
            .from('budget_forecast_monthly')
            .delete()
            .eq('project_id', id)
            .in('category', removedCategories);
        }

        for (const category of addedCategories) {
          const months = [];
          for (let month = 0; month < 12; month++) {
            months.push({
              project_id: id,
              category: category,
              month_year: `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`,
              forecasted_amount: 0,
              actual_amount: null
            });
          }

          const { error: insertError } = await supabase
            .from('budget_forecast_monthly')
            .insert(months);

          if (insertError && insertError.code !== '23505') {
            console.error('Error creating forecast:', insertError);
          }
        }
      } else {
        const { error } = await supabase
          .from('project_budgets')
          .insert([{
            project_id: id,
            categories: budgetForm.categories,
            budget_amount: 0
          }]);

        if (error) {
          throw error;
        }

        for (const category of budgetForm.categories) {
          const months = [];
          for (let month = 0; month < 12; month++) {
            months.push({
              project_id: id,
              category: category,
              month_year: `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`,
              forecasted_amount: 0,
              actual_amount: null
            });
          }

          const { error: insertError } = await supabase
            .from('budget_forecast_monthly')
            .insert(months);

          if (insertError && insertError.code !== '23505') {
            console.error('Error creating forecast:', insertError);
          }
        }
      }

      await fetchBudgets();
      await fetchMonthlyForecasts();
      setShowBudgetModal(false);
      setEditingBudget(null);
      setBudgetForm({
        categories: []
      });
      showNotification(editingBudget ? 'Budget updated successfully!' : 'Budget added successfully!', 'success');
    } catch (error: any) {
      console.error('Error saving budget:', error);
      showNotification(`Error saving budget: ${error.message}`, 'error');
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Budget Item',
      message: 'Are you sure you want to delete this budget item? This will also delete all associated monthly forecasts.',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('project_budgets')
        .delete()
        .eq('id', budgetId);

      if (error) {
        throw error;
      }

      await fetchBudgets();
      await fetchMonthlyForecasts();
      showNotification('Budget item deleted successfully!', 'success');
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      showNotification(`Error deleting budget item: ${error.message}`, 'error');
    }
  };

  const handleUpdateMonthlyValue = async (
    forecastId: string,
    field: 'forecasted_amount' | 'actual_amount',
    value: number
  ) => {
    try {
      const { error } = await supabase
        .from('budget_forecast_monthly')
        .update({ [field]: value })
        .eq('id', forecastId);

      if (error) {
        throw error;
      }

      setMonthlyForecasts(prev =>
        prev.map(f =>
          f.id === forecastId
            ? { ...f, [field]: value }
            : f
        )
      );
    } catch (error: any) {
      console.error('Error updating monthly value:', error);
      showNotification(`Error updating value: ${error.message}`, 'error');
    }
  };

  const calculateBudgetMetrics = () => {
    if (budgetViewFilter === 'monthly') {
      const targetMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      let totalBudget = 0;
      let totalSpent = 0;

      monthlyForecasts.forEach((forecast) => {
        if (forecast.month_year === targetMonth) {
          totalBudget += forecast.forecasted_amount || 0;
          totalSpent += forecast.actual_amount || 0;
        }
      });

      const remaining = totalBudget - totalSpent;
      const burnRate = totalSpent;

      return { totalBudget, totalSpent, remaining, burnRate };
    } else {
      let totalBudget = 0;
      let totalSpent = 0;

      monthlyForecasts.forEach((forecast) => {
        totalBudget += forecast.forecasted_amount || 0;
        totalSpent += forecast.actual_amount || 0;
      });

      const remaining = totalBudget - totalSpent;
      const currentMonth = new Date().getMonth() + 1;
      const burnRate = currentMonth > 0 ? totalSpent / currentMonth : 0;

      return { totalBudget, totalSpent, remaining, burnRate };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getAttachmentCount = (attachments?: string) => {
    if (!attachments || attachments.trim() === '') return 0;
    try {
      const parsed = JSON.parse(attachments);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading project...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {editingProject ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Description</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    rows={3}
                    className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                    placeholder="Enter project description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project Start Date</label>
                  <input
                    type="date"
                    value={projectForm.start_date}
                    onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    className="w-full max-w-2xl px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleProjectUpdate}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={cancelEditingProject}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                  <button
                    onClick={startEditingProject}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit project details"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
                {project.description && (
                  <p className="text-gray-600 mt-2">{project.description}</p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date</span>
                    <p className="text-sm text-gray-900 mt-1">
                      {project.start_date
                        ? new Date(project.start_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">State</span>
                    <div className="mt-1">
                      <ProjectStatusDropdown
                        currentState={project.state}
                        projectId={project.id}
                        onStateUpdate={(newState) => {
                          setProject(prev => prev ? { ...prev, state: newState } : null);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                    <div className="mt-1">
                      <ProjectHealthStatus
                        currentStatus={project.health_status}
                        projectId={project.id}
                        onStatusUpdate={(newStatus) => {
                          setProject(prev => prev ? { ...prev, health_status: newStatus } : null);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</span>
                    <p className="text-sm text-gray-900 mt-1">{formatDate(project.created_at)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6 overflow-visible">
        {activeTab === 'overview' && (
          <div className="overflow-visible">
            {overviewConfig && overviewConfig.sections.length > 0 ? (
              <div className="space-y-8 overflow-visible">
                {overviewConfig.sections.map((section) => (
                  <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-visible">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">{section.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible">
                      {section.fields.map((field) => (
                        <div key={field.id} className="overflow-visible">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              {field.customField.field_name.split('_').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                              {field.customField.is_required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {field.customField.track_history && (
                              <button
                                onClick={() => loadFieldHistory(field.customField.id, field.customField.field_label || field.customField.field_name)}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                title="View history"
                              >
                                <History className="w-3 h-3" />
                                History
                              </button>
                            )}
                          </div>
                          {(field.customField.field_label || field.customField.field_description) && (
                            <p className="text-xs text-gray-500 mb-2">
                              {field.customField.field_label || field.customField.field_description}
                            </p>
                          )}
                          {renderFieldControl(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={saveFieldValues}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Overview Configuration</h3>
                <p className="text-gray-600 mb-4">
                  This project template doesn't have an overview page configuration yet.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configure Overview Page
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className={isGanttFullscreen ? "fixed inset-0 z-50 bg-white p-6" : "bg-white rounded-lg shadow-sm border border-gray-200 p-6"}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (ganttRef.current) {
                      ganttRef.current.zoomIn();
                    }
                  }}
                  className="inline-flex items-center justify-center w-9 h-9 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (ganttRef.current) {
                      ganttRef.current.zoomOut();
                    }
                  }}
                  className="inline-flex items-center justify-center w-9 h-9 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsGanttFullscreen(!isGanttFullscreen)}
                  className="inline-flex items-center justify-center w-9 h-9 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  title={isGanttFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isGanttFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    if (ganttRef.current) {
                      ganttRef.current.toggleGroupByOwner();
                      setIsGroupedByOwner(!isGroupedByOwner);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Group className="w-4 h-4" />
                  {isGroupedByOwner ? 'Show All Tasks' : 'Group by Owner'}
                </button>
                <button
                  onClick={async () => {
                    if (ganttRef.current && id) {
                      const baselineData = ganttRef.current.setBaseline();
                      console.log('Baseline set:', baselineData);

                      // Save baseline to database
                      try {
                        // First, fetch the current task_data
                        const { data: currentData, error: fetchError } = await supabase
                          .from('project_tasks')
                          .select('task_data')
                          .eq('project_id', id)
                          .single();

                        if (fetchError) throw fetchError;

                        // Merge baseline into existing task_data
                        const updatedTaskData = {
                          ...currentData.task_data,
                          baseline: baselineData
                        };

                        // Update the record
                        const { error: updateError } = await supabase
                          .from('project_tasks')
                          .update({ task_data: updatedTaskData })
                          .eq('project_id', id);

                        if (updateError) throw updateError;

                        // Update local state to include baseline
                        setProjectTasks({
                          ...projectTasks,
                          baseline: baselineData
                        });

                        showNotification('Baseline set successfully for all tasks!', 'success');
                      } catch (error) {
                        console.error('Error saving baseline:', error);
                        showNotification('Failed to save baseline: ' + (error as Error).message, 'error');
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                  Set Baseline
                </button>
                <button
                  onClick={() => {
                    setTaskForm({ ...taskForm, parent_id: undefined });
                    setShowTaskModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Task
                </button>
              </div>
            </div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks by name..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div style={{ width: "100%", height: isGanttFullscreen ? "calc(100vh - 150px)" : "600px", overflow: "auto" }}>
              <Gantt
                ref={ganttRef}
                projecttasks={projectTasks}
                onTaskUpdate={saveProjectTasks}
                searchQuery={taskSearchQuery}
                onOpenTaskModal={(parentId) => {
                  console.log('=== onOpenTaskModal called ===');
                  console.log('parentId received:', parentId);
                  console.log('parentId type:', typeof parentId);
                  console.log('All tasks:', projectTasks.data);

                  // Find parent task and get its text/name
                  let parentWbs = '';
                  if (parentId) {
                    const parentTask = projectTasks.data.find((t: any) => t.id === parentId);
                    console.log('Searching for parent task with ID:', parentId);
                    console.log('Parent task found:', parentTask);
                    if (parentTask) {
                      // Use task text (name) as the identifier, fallback to ID
                      parentWbs = parentTask.text || parentTask.description || `Task ID: ${parentId}`;
                      console.log('Parent task identifier:', parentWbs);
                    } else {
                      console.log('WARNING: Parent task NOT found for ID:', parentId);
                      parentWbs = `Task ID: ${parentId}`;
                    }
                  }

                  setTaskForm({
                    description: '',
                    start_date: '',
                    duration: 1,
                    owner_id: '',
                    resource_ids: [],
                    parent_id: parentId,
                    parent_wbs: parentWbs,
                    successor_ids: [],
                    type: 'task',
                    progress: 0
                  });
                  console.log('Task form after setting - parent_wbs:', parentWbs);
                  setEditingTaskId(null);
                  setShowTaskModal(true);
                }}
                onEditTask={(taskId) => {
                  console.log("onEditTask callback called with taskId:", taskId);
                  console.log("projectTasks.data:", projectTasks.data);
                  const task = projectTasks.data.find((t: any) => t.id === taskId);
                  console.log("Found task:", task);
                  if (task) {
                    let startDate = task.start_date;

                    // Convert Date object to string if needed
                    if (startDate instanceof Date) {
                      startDate = startDate.toISOString().split('T')[0];
                    } else if (typeof startDate === 'string' && startDate.includes(' ')) {
                      startDate = startDate.split(' ')[0];
                    }

                    // Find successor tasks from links
                    const successorIds = (projectTasks.links || [])
                      .filter((link: any) => link.source === taskId)
                      .map((link: any) => link.target);

                    // Get parent WBS if task has a parent
                    let parentWbs = '';
                    if (task.parent && task.parent !== 0) {
                      const parentTask = projectTasks.data.find((t: any) => t.id === task.parent);
                      if (parentTask) {
                        parentWbs = parentTask.wbs || parentTask.$wbs || `Task #${task.parent}`;
                      }
                    }

                    console.log("Setting task form with:", {
                      description: task.text,
                      start_date: startDate,
                      duration: task.duration,
                      owner_id: task.owner_id || '',
                      parent_id: task.parent || undefined,
                      parent_wbs: parentWbs,
                      successor_ids: successorIds
                    });
                    setTaskForm({
                      description: task.text,
                      start_date: startDate,
                      duration: task.duration,
                      owner_id: task.owner_id || '',
                      resource_ids: task.resource_ids || [],
                      parent_id: task.parent || undefined,
                      parent_wbs: parentWbs,
                      successor_ids: successorIds,
                      type: task.type || 'task',
                      progress: Math.round((task.progress || 0) * 100)
                    });
                    setEditingTaskId(taskId);
                    console.log("Opening modal with editingTaskId:", taskId);
                    setShowTaskModal(true);
                  } else {
                    console.error("Task not found for ID:", taskId);
                  }
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'team' && id && (
          <ProjectTeams
            projectId={id}
            onTeamMembersChange={fetchProjectTeamMembers}
          />
        )}

        {activeTab === 'risks-issues' && (
          <div className="space-y-8">
            {/* Risks Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Risks</h3>
                <button
                  onClick={() => {
                    resetRiskForm();
                    setShowRiskModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Risk</span>
                </button>
              </div>

              {risks.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Risks</h4>
                  <p className="text-gray-600">No risks have been identified for this project yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {risks.map((risk) => (
                          <tr key={risk.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{risk.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                risk.type === 'Critical' ? 'bg-red-100 text-red-800' :
                                risk.type === 'High' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {risk.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                risk.status === 'Open' ? 'bg-red-100 text-red-800' :
                                risk.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                risk.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {risk.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate">{risk.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{risk.impact || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(risk.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditRisk(risk)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRisk(risk.id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Issues Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Issues</h3>
                <button
                  onClick={() => {
                    resetIssueForm();
                    setShowIssueModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Issue</span>
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Issues</h4>
                  <p className="text-gray-600">No issues have been reported for this project yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {issues.map((issue) => (
                          <tr key={issue.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{issue.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                issue.type === 'Critical' ? 'bg-red-100 text-red-800' :
                                issue.type === 'High' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {issue.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                issue.status === 'Open' ? 'bg-red-100 text-red-800' :
                                issue.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                issue.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {issue.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              <div className="truncate">{issue.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{issue.impact || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(issue.created_at)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleEditIssue(issue)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIssue(issue.id)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'change-management' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Change Requests</h3>
              <button
                onClick={() => {
                  resetChangeRequestForm();
                  setShowChangeRequestModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Change Request</span>
              </button>
            </div>

            {changeRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Change Requests</h4>
                <p className="text-gray-600">No change requests have been submitted for this project yet.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {changeRequests.map((changeRequest) => (
                        <tr key={changeRequest.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{changeRequest.request_title}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              changeRequest.type === 'Scope Change' ? 'bg-blue-100 text-blue-800' :
                              changeRequest.type === 'Schedule Change' ? 'bg-purple-100 text-purple-800' :
                              changeRequest.type === 'Budget Change' ? 'bg-green-100 text-green-800' :
                              changeRequest.type === 'Resource Change' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {changeRequest.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              changeRequest.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' :
                              changeRequest.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                              changeRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              changeRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {changeRequest.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-1">
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">S:</span>
                                <div className={`w-2 h-2 rounded-full ${getImpactColor(changeRequest.scope_impact)}`}></div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">R:</span>
                                <div className={`w-2 h-2 rounded-full ${getImpactColor(changeRequest.risk_impact)}`}></div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500">Re:</span>
                                <div className={`w-2 h-2 rounded-full ${getImpactColor(changeRequest.resource_impact)}`}></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <div className="truncate">{changeRequest.description}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getAttachmentCount(changeRequest.attachments) > 0 ? (
                              <div className="flex items-center space-x-2">
                                <File className="w-4 h-4 text-blue-600" />
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {getAttachmentCount(changeRequest.attachments)} file{getAttachmentCount(changeRequest.attachments) !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(changeRequest.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewChangeRequest(changeRequest)}
                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditChangeRequest(changeRequest)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-6">
            {budgets.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Categories Yet</h3>
                  <p className="text-gray-600 mb-6">Add budget categories to start tracking your annual forecast.</p>
                  <button
                    onClick={handleAddBudget}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Budget Categories
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Annual Budget Forecast ({selectedYear})</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleAddBudget}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Manage Categories
                    </button>
                    <div className="w-px h-6 bg-gray-300"></div>
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">View:</span>
                      <select
                        value={budgetViewFilter}
                        onChange={(e) => setBudgetViewFilter(e.target.value as 'monthly' | 'yearly')}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                    {budgetViewFilter === 'monthly' && (
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Month:</span>
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(Number(e.target.value))}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                            <option key={index} value={index}>
                              {month}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Year:</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <BudgetSummaryTiles
                  metrics={calculateBudgetMetrics()}
                  viewFilter={budgetViewFilter}
                  selectedMonth={selectedMonth}
                />

                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>How to use:</strong> Enter your forecasted amounts for each month, then record actual spending.
                    The system automatically calculates variance percentages.
                    <span className="text-green-600 font-medium"> Green</span> indicates under budget,
                    <span className="text-red-600 font-medium"> red</span> indicates over budget.
                  </p>
                </div>
                <MonthlyBudgetGrid
                  forecasts={monthlyForecasts}
                  selectedYear={selectedYear}
                  onUpdateValue={handleUpdateMonthlyValue}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'benefit-tracking' && (
          <BenefitTracking projectId={id!} />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Project Documents</h3>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Document
                  </button>
                </label>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
                  <p className="text-gray-600">Upload your first document to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <File className="w-8 h-8 text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {doc.file_name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Risk Modal */}
      {showRiskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRisk ? 'Edit Risk' : 'Add New Risk'}
            </h3>
            <form onSubmit={handleRiskSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={riskForm.title}
                  onChange={(e) => setRiskForm({ ...riskForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                  <input
                    type="text"
                    value={riskForm.owner}
                    onChange={(e) => setRiskForm({ ...riskForm, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                  <input
                    type="text"
                    value={riskForm.assigned_to}
                    onChange={(e) => setRiskForm({ ...riskForm, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={riskForm.status}
                    onChange={(e) => setRiskForm({ ...riskForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={riskForm.category}
                    onChange={(e) => setRiskForm({ ...riskForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Resource">Resource</option>
                    <option value="Management">Management</option>
                    <option value="Technical">Technical</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Probability (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={riskForm.probability}
                    onChange={(e) => setRiskForm({ ...riskForm, probability: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Impact</label>
                  <select
                    value={riskForm.impact}
                    onChange={(e) => setRiskForm({ ...riskForm, impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={riskForm.cost}
                  onChange={(e) => setRiskForm({ ...riskForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={riskForm.description}
                  onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={riskForm.notes}
                  onChange={(e) => setRiskForm({ ...riskForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRiskModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {editingRisk ? 'Update Risk' : 'Add Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingIssue ? 'Edit Issue' : 'Add New Issue'}
            </h3>
            <form onSubmit={handleIssueSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={issueForm.title}
                  onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner</label>
                  <input
                    type="text"
                    value={issueForm.owner}
                    onChange={(e) => setIssueForm({ ...issueForm, owner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                  <input
                    type="text"
                    value={issueForm.assigned_to}
                    onChange={(e) => setIssueForm({ ...issueForm, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={issueForm.status}
                    onChange={(e) => setIssueForm({ ...issueForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={issueForm.category}
                    onChange={(e) => setIssueForm({ ...issueForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Resource">Resource</option>
                    <option value="Management">Management</option>
                    <option value="Technical">Technical</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={issueForm.priority}
                  onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution</label>
                <textarea
                  value={issueForm.resolution}
                  onChange={(e) => setIssueForm({ ...issueForm, resolution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {editingIssue ? 'Update Issue' : 'Add Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingBudget ? 'Edit Budget Categories' : 'Add Budget Categories'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Categories (you can select multiple)
                </label>
                <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {getCostCategoryOptions().length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm mb-2">No budget categories available.</p>
                      <p className="text-xs">Please add budget categories in Settings → Budget Categories first.</p>
                    </div>
                  ) : (
                    getCostCategoryOptions().map((category) => (
                      <label
                        key={category}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={budgetForm.categories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{category}</span>
                      </label>
                    ))
                  )}
                </div>
                {budgetForm.categories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Selected categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {budgetForm.categories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(cat)}
                            className="hover:text-blue-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingBudget ? 'Update Budget' : 'Add Budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingChangeRequest ? 'Edit Change Request' : 'Add New Change Request'}
            </h3>
            <form onSubmit={handleChangeRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={changeRequestForm.title}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={changeRequestForm.type}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Scope Change">Scope Change</option>
                  <option value="Schedule Change">Schedule Change</option>
                  <option value="Budget Change">Budget Change</option>
                  <option value="Resource Change">Resource Change</option>
                  <option value="Quality Change">Quality Change</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={changeRequestForm.description}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
                <textarea
                  value={changeRequestForm.justification}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, justification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scope Impact</label>
                  <select
                    value={changeRequestForm.scope_impact}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, scope_impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Impact</label>
                  <select
                    value={changeRequestForm.risk_impact}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, risk_impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resource Impact</label>
                  <select
                    value={changeRequestForm.resource_impact}
                    onChange={(e) => setChangeRequestForm({ ...changeRequestForm, resource_impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost Impact</label>
                <input
                  type="text"
                  value={changeRequestForm.cost_impact}
                  onChange={(e) => setChangeRequestForm({ ...changeRequestForm, cost_impact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe cost impact (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, DOC, XLS, PPT, Images, ZIP (Max 10MB per file)
                    </span>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center space-x-3">
                          <File className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {(file.fileSize / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(file.path, file.fileName)}
                            className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(file.path)}
                            className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChangeRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingChangeRequest ? 'Update Change Request' : 'Add Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChangeRequestPreview && viewingChangeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Change Request Details</h3>
              <button
                onClick={() => setShowChangeRequestPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Title</label>
                  <p className="text-base text-gray-900 font-semibold">{viewingChangeRequest.request_title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
                  <p className="text-base text-gray-900">{viewingChangeRequest.type}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  viewingChangeRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  viewingChangeRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  viewingChangeRequest.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                  viewingChangeRequest.status === 'Implemented' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {viewingChangeRequest.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Description</label>
                <p className="text-base text-gray-900 whitespace-pre-wrap">{viewingChangeRequest.description}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Justification</label>
                <p className="text-base text-gray-900 whitespace-pre-wrap">{viewingChangeRequest.justification}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Scope Impact</label>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getImpactColor(viewingChangeRequest.scope_impact)}`}></div>
                    <span className="text-base text-gray-900">{viewingChangeRequest.scope_impact}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Risk Impact</label>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getImpactColor(viewingChangeRequest.risk_impact)}`}></div>
                    <span className="text-base text-gray-900">{viewingChangeRequest.risk_impact}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Resource Impact</label>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getImpactColor(viewingChangeRequest.resource_impact)}`}></div>
                    <span className="text-base text-gray-900">{viewingChangeRequest.resource_impact}</span>
                  </div>
                </div>
              </div>

              {viewingChangeRequest.cost_impact && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Cost Impact</label>
                  <p className="text-base text-gray-900">{viewingChangeRequest.cost_impact}</p>
                </div>
              )}

              {viewingChangeRequest.attachments && getAttachmentCount(viewingChangeRequest.attachments) > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-3">Attachments</label>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const files = JSON.parse(viewingChangeRequest.attachments);
                        return files.map((file: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <File className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.fileSize / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDownloadFile(file.path, file.fileName)}
                              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </button>
                          </div>
                        ));
                      } catch (e) {
                        return <p className="text-sm text-gray-500">No attachments available</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(viewingChangeRequest.created_at)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                  <p className="text-sm text-gray-900">{formatDate(viewingChangeRequest.updated_at)}</p>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeRequestPreview(false);
                    handleEditChangeRequest(viewingChangeRequest);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangeRequestPreview(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {editingTaskId
                      ? 'Edit Task'
                      : taskForm.parent_id
                        ? 'Create Subtask'
                        : 'Create New Task'}
                  </h3>
                  {!editingTaskId && taskForm.parent_wbs && (
                    <p className="text-sm text-gray-500 mt-1">
                      This will be created as a subtask under {taskForm.parent_wbs}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTaskId(null);
                    setTaskForm({
                      description: '',
                      start_date: '',
                      duration: 1,
                      owner_id: '',
                      resource_ids: [],
                      parent_id: undefined,
                      parent_wbs: '',
                      successor_ids: [],
                      type: 'task',
                      progress: 0
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-4">
                {taskForm.parent_wbs && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parent Task
                    </label>
                    <input
                      type="text"
                      value={taskForm.parent_wbs}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                      placeholder="No parent task"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This task will be created as a subtask under the parent task shown above
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.type}
                    onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="task">Task</option>
                    <option value="project">Summary Task</option>
                    <option value="milestone">Milestone</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {taskForm.type === 'task' && 'Standard task with start date, duration, and progress tracking'}
                    {taskForm.type === 'project' && 'Container for subtasks with automatic duration calculation'}
                    {taskForm.type === 'milestone' && 'Key event or goal marker with zero duration'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={taskForm.start_date}
                    onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (Days) {taskForm.type !== 'milestone' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    min={taskForm.type === 'milestone' ? '0' : '1'}
                    value={taskForm.type === 'milestone' ? 0 : taskForm.duration}
                    onChange={(e) => setTaskForm({ ...taskForm, duration: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                    placeholder="Enter duration in days..."
                    required={taskForm.type !== 'milestone'}
                    disabled={taskForm.type === 'milestone' || taskForm.type === 'project'}
                  />
                  {taskForm.type === 'milestone' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Milestones have zero duration by default
                    </p>
                  )}
                  {taskForm.type === 'project' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Summary task duration is calculated from subtasks
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Owners (Multiple Selection)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {projectTeamMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No team members assigned. Add team members in the Team tab first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {projectTeamMembers.map((member: any) => (
                          <label
                            key={member.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={taskForm.resource_ids.includes(member.resource_id)}
                              onChange={(e) => {
                                const resourceId = member.resource_id;
                                if (e.target.checked) {
                                  setTaskForm({
                                    ...taskForm,
                                    resource_ids: [...taskForm.resource_ids, resourceId]
                                  });
                                } else {
                                  setTaskForm({
                                    ...taskForm,
                                    resource_ids: taskForm.resource_ids.filter(id => id !== resourceId)
                                  });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {member.resources?.display_name || 'Unknown'}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {taskForm.resource_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {taskForm.resource_ids.length} team member(s) selected
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Progress
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={taskForm.progress}
                      onChange={(e) => setTaskForm({ ...taskForm, progress: parseInt(e.target.value) })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      disabled={taskForm.type === 'milestone'}
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={taskForm.progress}
                      onChange={(e) => {
                        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setTaskForm({ ...taskForm, progress: value });
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={taskForm.type === 'milestone'}
                    />
                    <span className="text-sm font-medium text-gray-700">%</span>
                  </div>
                  {taskForm.type === 'milestone' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Milestones don't track progress
                    </p>
                  )}
                  {taskForm.type === 'project' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Summary task progress is calculated from subtasks
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Successor Tasks (Multiple Selection)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select tasks that should start only after this task is completed. Hold Ctrl/Cmd to select multiple.
                  </p>
                  <select
                    multiple
                    value={taskForm.successor_ids.map(String)}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
                      setTaskForm({
                        ...taskForm,
                        successor_ids: selectedOptions
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    size={6}
                  >
                    {getAllTasksWithWBS()
                      .filter(task => editingTaskId ? task.id !== editingTaskId : true)
                      .length === 0 ? (
                      <option disabled>No tasks available. Create the task first, then edit it to add successors.</option>
                    ) : (
                      getAllTasksWithWBS()
                        .filter(task => editingTaskId ? task.id !== editingTaskId : true)
                        .map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.wbs ? `${task.wbs} - ` : ''}{task.text}
                          </option>
                        ))
                    )}
                  </select>
                  {taskForm.successor_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {taskForm.successor_ids.length} successor task(s) selected
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingTaskId ? 'Update Task' : 'Create Task'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Field History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Field History</h3>
                <p className="text-sm text-gray-600 mt-1">{historyFieldName}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              {loadingHistory ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading history...</p>
                </div>
              ) : fieldHistory.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No history found for this field</p>
                  <p className="text-sm text-gray-500 mt-2">Changes will appear here after the field value is updated</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldHistory.map((record, index) => (
                    <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900">Value:</span>
                            <span className="text-sm text-gray-700">{record.field_value || '(empty)'}</span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>
                              <strong>Changed:</strong> {new Date(record.changed_at).toLocaleString()}
                            </span>
                            <span>
                              <strong>By:</strong> {record.changed_by}
                            </span>
                          </div>
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;