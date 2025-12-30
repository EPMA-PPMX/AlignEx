import { supabase } from './supabase';

interface TrackFieldHistoryParams {
  projectId: string;
  fieldId: string;
  fieldValue: string;
  projectName: string;
  fieldName: string;
  changedBy?: string;
}

export async function trackFieldHistory({
  projectId,
  fieldId,
  fieldValue,
  projectName,
  fieldName,
  changedBy = 'system'
}: TrackFieldHistoryParams) {
  try {
    const { error } = await supabase
      .from('project_field_value_history')
      .insert({
        project_id: projectId,
        field_id: fieldId,
        field_value: fieldValue,
        project_name: projectName,
        field_name: fieldName,
        changed_by: changedBy,
        changed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error tracking field history:', error);
    }
  } catch (error) {
    console.error('Error in trackFieldHistory:', error);
  }
}

export async function shouldTrackFieldHistory(fieldId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('track_history')
      .eq('id', fieldId)
      .single();

    if (error) {
      console.error('Error checking field history tracking:', error);
      return false;
    }

    return data?.track_history || false;
  } catch (error) {
    console.error('Error in shouldTrackFieldHistory:', error);
    return false;
  }
}
