import { supabase } from './supabase';

type EntityType = 'risk' | 'issue' | 'change_request';

interface CustomFieldValue {
  field_id: string;
  value: string;
}

const getTableName = (entityType: EntityType): string => {
  const tableMap = {
    risk: 'risk_field_values',
    issue: 'issue_field_values',
    change_request: 'change_request_field_values'
  };
  return tableMap[entityType];
};

const getEntityIdColumn = (entityType: EntityType): string => {
  const columnMap = {
    risk: 'risk_id',
    issue: 'issue_id',
    change_request: 'change_request_id'
  };
  return columnMap[entityType];
};

export const loadCustomFieldValues = async (
  entityType: EntityType,
  entityId: string
): Promise<Record<string, string>> => {
  try {
    const tableName = getTableName(entityType);
    const entityIdColumn = getEntityIdColumn(entityType);

    const { data: fieldValues, error: valuesError } = await supabase
      .from(tableName)
      .select('field_id, value, custom_fields!inner(field_name)')
      .eq(entityIdColumn, entityId);

    if (valuesError) {
      console.error('Error loading custom field values:', valuesError);
      return {};
    }

    const values: Record<string, string> = {};
    fieldValues?.forEach((fv: any) => {
      if (fv.custom_fields?.field_name) {
        values[fv.custom_fields.field_name] = fv.value || '';
      }
    });

    return values;
  } catch (error) {
    console.error('Error loading custom field values:', error);
    return {};
  }
};

export const saveCustomFieldValues = async (
  entityType: EntityType,
  entityId: string,
  values: Record<string, string>
): Promise<boolean> => {
  try {
    const tableName = getTableName(entityType);
    const entityIdColumn = getEntityIdColumn(entityType);

    const { data: customFields, error: fieldsError } = await supabase
      .from('custom_fields')
      .select('id, field_name')
      .eq('entity_type', entityType);

    if (fieldsError) {
      console.error('Error fetching custom fields:', fieldsError);
      return false;
    }

    const fieldNameToIdMap: Record<string, string> = {};
    customFields?.forEach(cf => {
      fieldNameToIdMap[cf.field_name] = cf.id;
    });

    for (const [fieldName, value] of Object.entries(values)) {
      const fieldId = fieldNameToIdMap[fieldName];
      if (!fieldId) continue;

      const payload = {
        [entityIdColumn]: entityId,
        field_id: fieldId,
        value: value
      };

      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert(payload, {
          onConflict: `${entityIdColumn},field_id`
        });

      if (upsertError) {
        console.error('Error saving custom field value:', upsertError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving custom field values:', error);
    return false;
  }
};

export const getCustomFields = async (
  entityType: EntityType,
  section?: string
) => {
  try {
    let query = supabase
      .from('custom_fields')
      .select('*')
      .eq('entity_type', entityType)
      .order('display_order', { ascending: true });

    if (section) {
      query = query.eq('section', section);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching custom fields:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }
};
