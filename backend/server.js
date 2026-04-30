const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------------------------------------------------------------
// Table whitelist (Step 4)
// ---------------------------------------------------------------------------
const ALLOWED_TABLES = [
  'projects',
  'custom_fields',
  'project_templates',
  'change_requests',
  'project_risks',
  'project_issues',
  'overview_configurations',
  'project_field_values',
  'project_documents',
  'project_budgets',
  // additional tables used by the frontend
  'resources',
  'resource_field_values',
  'organization_team_members',
  'project_team_members',
  'action_items',
  'project_tasks',
  'task_resource_assignments',
  'timesheet_entries',
  'user_timesheet_items',
  'timesheet_submissions',
  'non_project_categories',
  'monthly_benefit_tracking',
  'budget_forecast_monthly',
  'budget_categories',
  'status_reports',
  'organizational_priorities',
  'project_initiation_requests',
  'skill_categories',
  'skills',
  'user_skills',
  'roles',
  'role_skill_requirements',
  'skill_goals',
  'organizations',
  'organization_modules',
  'user_licenses',
  'license_tier_permissions',
  'user_preferences',
  'schedule_templates',
  'form_field_values',
  'custom_field_history',
  'users',
];

// ---------------------------------------------------------------------------
// PostgreSQL pool (Steps 2 & 3)
// ---------------------------------------------------------------------------
const dbProvider = (process.env.DB_PROVIDER || 'supabase').toLowerCase();

let poolConfig;
if (dbProvider === 'local') {
  poolConfig = { connectionString: process.env.LOCAL_DB_URL };
} else if (dbProvider === 'azure') {
  poolConfig = {
    connectionString: process.env.AZURE_DB_URL,
    ssl: { rejectUnauthorized: false },
  };
} else {
  // Default: derive connection string from Supabase env vars
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  if (dbUrl) {
    poolConfig = { connectionString: dbUrl, ssl: { rejectUnauthorized: false } };
  } else if (supabaseUrl) {
    // Derive Supabase direct connection from project URL
    // https://<ref>.supabase.co  →  postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
    const ref = supabaseUrl.replace('https://', '').split('.')[0];
    const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD || '');
    poolConfig = {
      connectionString: `postgresql://postgres:${password}@db.${ref}.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false },
    };
  } else {
    poolConfig = {};
  }
}

const pool = new Pool(poolConfig);

// ---------------------------------------------------------------------------
// SQL translation helpers (Step 3)
// ---------------------------------------------------------------------------

/**
 * Sanitise an identifier (table/column name).
 * Only alphanumeric chars and underscores are allowed.
 */
function sanitizeIdentifier(name) {
  if (typeof name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name)) {
    throw new Error(`Invalid identifier: ${name}`);
  }
  return `"${name.replace(/\./g, '"."')}"`;
}

/**
 * Build the WHERE clause from the filters array.
 * Returns { whereClause: string, params: any[], nextIndex: number }
 */
function buildWhere(filters, startIndex) {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [], nextIndex: startIndex };
  }

  const parts = [];
  const params = [];
  let idx = startIndex;

  for (const f of filters) {
    const col = sanitizeIdentifier(f.field);

    switch (f.operator) {
      case 'eq':
        parts.push(`${col} = $${idx++}`);
        params.push(f.value);
        break;
      case 'neq':
        parts.push(`${col} != $${idx++}`);
        params.push(f.value);
        break;
      case 'like':
        parts.push(`${col} LIKE $${idx++}`);
        params.push(f.value);
        break;
      case 'ilike':
        parts.push(`${col} ILIKE $${idx++}`);
        params.push(f.value);
        break;
      case 'in':
        parts.push(`${col} = ANY($${idx++})`);
        params.push(f.value); // pg accepts array directly
        break;
      case 'not': {
        // f.value = { operator: string, value: any }
        const inner = f.value;
        if (inner.operator === 'in') {
          parts.push(`NOT (${col} = ANY($${idx++}))`);
          params.push(inner.value);
        } else {
          parts.push(`NOT (${col} = $${idx++})`);
          params.push(inner.value);
        }
        break;
      }
      case 'gte':
        parts.push(`${col} >= $${idx++}`);
        params.push(f.value);
        break;
      case 'lte':
        parts.push(`${col} <= $${idx++}`);
        params.push(f.value);
        break;
      case 'gt':
        parts.push(`${col} > $${idx++}`);
        params.push(f.value);
        break;
      case 'lt':
        parts.push(`${col} < $${idx++}`);
        params.push(f.value);
        break;
      case 'is':
        if (f.value === null) {
          parts.push(`${col} IS NULL`);
        } else {
          parts.push(`${col} IS $${idx++}`);
          params.push(f.value);
        }
        break;
      default:
        throw new Error(`Unsupported filter operator: ${f.operator}`);
    }
  }

  return {
    whereClause: parts.length ? `WHERE ${parts.join(' AND ')}` : '',
    params,
    nextIndex: idx,
  };
}

/**
 * Translate a query descriptor into a parameterized SQL statement.
 * Returns { sql: string, params: any[] }
 */
function buildSQL(descriptor) {
  const { table, operation, columns, filters, order, limit, data, upsertOptions } = descriptor;

  const tbl = sanitizeIdentifier(table);
  const { whereClause, params: filterParams } = buildWhere(filters || [], 1);

  const orderClause = order
    ? `ORDER BY ${sanitizeIdentifier(order.column)} ${order.ascending !== false ? 'ASC' : 'DESC'}`
    : '';
  const limitClause = limit != null ? `LIMIT ${parseInt(limit, 10)}` : '';

  switch (operation) {
    case 'select': {
      // columns may be '*' or a comma-separated list; validate each token
      const colList = (columns || '*') === '*'
        ? '*'
        : columns.split(',').map(c => sanitizeIdentifier(c.trim())).join(', ');
      const sql = `SELECT ${colList} FROM ${tbl} ${whereClause} ${orderClause} ${limitClause}`.trim();
      return { sql, params: filterParams };
    }

    case 'insert': {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) throw new Error('No data provided for insert');

      const keys = Object.keys(rows[0]);
      const colNames = keys.map(k => sanitizeIdentifier(k)).join(', ');
      const allParams = [];
      const valuePlaceholders = rows.map(row => {
        const rowPlaceholders = keys.map(() => `$${allParams.length + 1 + (allParams.push(row[keys[allParams.length]]) && 0)}`);
        // rebuild properly
        return null; // placeholder — rebuilt below
      });

      // Rebuild properly with correct param indexing
      const params2 = [];
      const rowClauses = rows.map(row => {
        const holders = keys.map(k => {
          params2.push(row[k]);
          return `$${params2.length}`;
        });
        return `(${holders.join(', ')})`;
      });

      const sql = `INSERT INTO ${tbl} (${colNames}) VALUES ${rowClauses.join(', ')} RETURNING *`;
      return { sql, params: params2 };
    }

    case 'upsert': {
      const rows = Array.isArray(data) ? data : [data];
      if (rows.length === 0) throw new Error('No data provided for upsert');

      const keys = Object.keys(rows[0]);
      const colNames = keys.map(k => sanitizeIdentifier(k)).join(', ');

      const params2 = [];
      const rowClauses = rows.map(row => {
        const holders = keys.map(k => {
          params2.push(row[k]);
          return `$${params2.length}`;
        });
        return `(${holders.join(', ')})`;
      });

      let conflictClause = '';
      if (upsertOptions && upsertOptions.onConflict) {
        const conflictCols = upsertOptions.onConflict
          .split(',')
          .map(c => sanitizeIdentifier(c.trim()))
          .join(', ');
        if (upsertOptions.ignoreDuplicates) {
          conflictClause = `ON CONFLICT (${conflictCols}) DO NOTHING`;
        } else {
          const updateCols = keys
            .filter(k => !upsertOptions.onConflict.split(',').map(c => c.trim()).includes(k))
            .map(k => `${sanitizeIdentifier(k)} = EXCLUDED.${sanitizeIdentifier(k)}`)
            .join(', ');
          conflictClause = updateCols
            ? `ON CONFLICT (${conflictCols}) DO UPDATE SET ${updateCols}`
            : `ON CONFLICT (${conflictCols}) DO NOTHING`;
        }
      }

      const sql = `INSERT INTO ${tbl} (${colNames}) VALUES ${rowClauses.join(', ')} ${conflictClause} RETURNING *`;
      return { sql, params: params2 };
    }

    case 'update': {
      if (!data || Object.keys(data).length === 0) throw new Error('No data provided for update');
      const keys = Object.keys(data);
      const params2 = [];
      const setClauses = keys.map(k => {
        params2.push(data[k]);
        return `${sanitizeIdentifier(k)} = $${params2.length}`;
      });

      // re-index filter params after SET params
      const { whereClause: wc2, params: fp2 } = buildWhere(filters || [], params2.length + 1);
      const sql = `UPDATE ${tbl} SET ${setClauses.join(', ')} ${wc2} ${orderClause} ${limitClause} RETURNING *`.trim();
      return { sql, params: [...params2, ...fp2] };
    }

    case 'delete': {
      const sql = `DELETE FROM ${tbl} ${whereClause} ${orderClause} ${limitClause} RETURNING *`.trim();
      return { sql, params: filterParams };
    }

    default:
      throw new Error(`Unsupported operation: ${operation}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/query  — generic query endpoint (Steps 2, 3, 4)
// ---------------------------------------------------------------------------
app.post('/api/query', async (req, res) => {
  const { table, operation } = req.body;

  // Step 4: whitelist check
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(403).json({ error: { message: `Table '${table}' is not allowed` } });
  }

  try {
    const { sql, params } = buildSQL(req.body);

    const result = await pool.query(sql, params);
    return res.json({ data: result.rows });
  } catch (err) {
    console.error('[/api/query] error:', err.message, '\nbody:', JSON.stringify(req.body));
    return res.status(400).json({ error: { message: err.message } });
  }
});

// ---------------------------------------------------------------------------
// File upload / storage helpers
// ---------------------------------------------------------------------------
const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'application/zip',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Allowed types: PDF, Word, Excel, PowerPoint, Images (JPG, PNG, GIF), Text, ZIP'), false);
    }
  },
});

// Supabase client kept only for storage operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Custom Fields Routes
// ---------------------------------------------------------------------------
app.get('/api/custom-fields', async (req, res) => {
  try {
    const { rows, error } = await pool.query(
      'SELECT * FROM custom_fields ORDER BY created_at DESC'
    );
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/custom-fields', async (req, res) => {
  try {
    const { field_name, field_type, field_label, is_required, default_value, options } = req.body;
    if (!field_name || !field_type || !field_label) {
      return res.status(400).json({ error: 'Field name, type, and label are required' });
    }
    const validTypes = ['text', 'number', 'email', 'date', 'dropdown', 'radio', 'checkbox', 'textarea'];
    if (!validTypes.includes(field_type)) {
      return res.status(400).json({ error: 'Invalid field type' });
    }
    const { rows } = await pool.query(
      `INSERT INTO custom_fields (field_name, field_type, field_label, is_required, default_value, options)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [field_name, field_type, field_label, is_required || false, default_value || null, options || null]
    );
    res.status(201).json({ message: 'Custom field created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { field_name, field_type, field_label, is_required, default_value, options } = req.body;
    const { rows } = await pool.query(
      `UPDATE custom_fields SET field_name=$1, field_type=$2, field_label=$3, is_required=$4,
       default_value=$5, options=$6, updated_at=now() WHERE id=$7 RETURNING *`,
      [field_name, field_type, field_label, is_required, default_value, options, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Custom field not found' });
    res.json({ message: 'Custom field updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM custom_fields WHERE id=$1', [id]);
    res.json({ message: 'Custom field deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Projects Routes
// ---------------------------------------------------------------------------
app.get('/api/projects', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projects WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, template_id } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' });
    const { rows } = await pool.query(
      `INSERT INTO projects (name, description, template_id, status)
       VALUES ($1, $2, $3, 'In-Progress') RETURNING *`,
      [name.trim(), description ? description.trim() : null, template_id || null]
    );
    res.status(201).json({ message: 'Project created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Project Templates Routes
// ---------------------------------------------------------------------------
app.get('/api/project-templates', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM project_templates ORDER BY created_at DESC');
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/project-templates/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM project_templates WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Project template not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/project-templates', async (req, res) => {
  try {
    const { template_name, template_description } = req.body;
    if (!template_name || !template_name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO project_templates (template_name, template_description) VALUES ($1, $2) RETURNING *',
      [template_name.trim(), template_description ? template_description.trim() : null]
    );
    res.status(201).json({ message: 'Project template created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/project-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { template_name, template_description } = req.body;
    const { rows } = await pool.query(
      'UPDATE project_templates SET template_name=$1, template_description=$2, updated_at=now() WHERE id=$3 RETURNING *',
      [template_name, template_description, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Project template not found' });
    res.json({ message: 'Project template updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/project-templates/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM project_templates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Project template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Overview Configurations Routes
// ---------------------------------------------------------------------------
app.get('/api/overview-configurations/:templateId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM overview_configurations WHERE template_id=$1',
      [req.params.templateId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Configuration not found' });
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/overview-configurations', async (req, res) => {
  try {
    const { template_id, sections } = req.body;
    if (!template_id || !sections) {
      return res.status(400).json({ error: 'Template ID and sections are required' });
    }
    const { rows: existing } = await pool.query(
      'SELECT id FROM overview_configurations WHERE template_id=$1',
      [template_id]
    );
    let result;
    if (existing.length > 0) {
      const { rows } = await pool.query(
        'UPDATE overview_configurations SET sections=$1, updated_at=now() WHERE template_id=$2 RETURNING *',
        [sections, template_id]
      );
      result = { data: rows[0], message: 'Configuration updated successfully' };
    } else {
      const { rows } = await pool.query(
        'INSERT INTO overview_configurations (template_id, sections) VALUES ($1, $2) RETURNING *',
        [template_id, sections]
      );
      result = { data: rows[0], message: 'Configuration created successfully' };
    }
    res.status(200).json(result);
  } catch (err) {
    console.error('Error saving overview configuration:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/overview-configurations/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const { sections } = req.body;
    const { rows } = await pool.query(
      'UPDATE overview_configurations SET sections=$1, updated_at=now() WHERE template_id=$2 RETURNING *',
      [sections, templateId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Configuration not found' });
    res.json({ message: 'Configuration updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/overview-configurations/:templateId', async (req, res) => {
  try {
    await pool.query('DELETE FROM overview_configurations WHERE template_id=$1', [req.params.templateId]);
    res.json({ message: 'Configuration deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Project Field Values Routes
// ---------------------------------------------------------------------------
app.get('/api/projects/:projectId/field-values', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_field_values WHERE project_id=$1',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/field-values', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fieldValues } = req.body;
    if (!fieldValues || typeof fieldValues !== 'object') {
      return res.status(400).json({ error: 'Field values are required' });
    }
    const records = Object.entries(fieldValues).map(([fieldId, value]) => ({
      project_id: projectId,
      field_id: fieldId,
      field_value: value,
    }));
    if (records.length === 0) return res.status(400).json({ error: 'No field values provided' });

    const results = [];
    for (const r of records) {
      const { rows } = await pool.query(
        `INSERT INTO project_field_values (project_id, field_id, field_value)
         VALUES ($1, $2, $3)
         ON CONFLICT (project_id, field_id) DO UPDATE SET field_value=EXCLUDED.field_value
         RETURNING *`,
        [r.project_id, r.field_id, r.field_value]
      );
      results.push(rows[0]);
    }
    res.json({ message: 'Field values saved successfully', data: results });
  } catch (err) {
    console.error('Error saving field values:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/field-values/:fieldId', async (req, res) => {
  try {
    const { projectId, fieldId } = req.params;
    const { field_value } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO project_field_values (project_id, field_id, field_value)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, field_id) DO UPDATE SET field_value=EXCLUDED.field_value, updated_at=now()
       RETURNING *`,
      [projectId, fieldId, field_value]
    );
    res.json({ message: 'Field value updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/field-values/:fieldId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM project_field_values WHERE project_id=$1 AND field_id=$2',
      [req.params.projectId, req.params.fieldId]
    );
    res.json({ message: 'Field value deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Project Risks Routes
// ---------------------------------------------------------------------------
app.get('/api/projects/:projectId/risks', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_risks WHERE project_id=$1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/risks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, impact, type, status } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Risk title and description are required' });
    }
    if (!['Critical', 'High', 'Medium'].includes(type)) {
      return res.status(400).json({ error: 'Invalid risk type' });
    }
    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid risk status' });
    }
    const { rows } = await pool.query(
      `INSERT INTO project_risks (project_id, title, description, impact, type, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, title.trim(), description.trim(), impact ? impact.trim() : null, type, status]
    );
    res.status(201).json({ message: 'Risk created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/risks/:riskId', async (req, res) => {
  try {
    const { projectId, riskId } = req.params;
    const { title, description, impact, type, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE project_risks SET title=$1, description=$2, impact=$3, type=$4, status=$5, updated_at=now()
       WHERE id=$6 AND project_id=$7 RETURNING *`,
      [title, description, impact, type, status, riskId, projectId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Risk not found' });
    res.json({ message: 'Risk updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/risks/:riskId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM project_risks WHERE id=$1 AND project_id=$2',
      [req.params.riskId, req.params.projectId]
    );
    res.json({ message: 'Risk deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Project Issues Routes
// ---------------------------------------------------------------------------
app.get('/api/projects/:projectId/issues', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_issues WHERE project_id=$1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/issues', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, impact, type, status } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Issue title and description are required' });
    }
    if (!['Critical', 'High', 'Medium'].includes(type)) {
      return res.status(400).json({ error: 'Invalid issue type' });
    }
    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid issue status' });
    }
    const { rows } = await pool.query(
      `INSERT INTO project_issues (project_id, title, description, impact, type, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [projectId, title.trim(), description.trim(), impact ? impact.trim() : null, type, status]
    );
    res.status(201).json({ message: 'Issue created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/issues/:issueId', async (req, res) => {
  try {
    const { projectId, issueId } = req.params;
    const { title, description, impact, type, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE project_issues SET title=$1, description=$2, impact=$3, type=$4, status=$5, updated_at=now()
       WHERE id=$6 AND project_id=$7 RETURNING *`,
      [title, description, impact, type, status, issueId, projectId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json({ message: 'Issue updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/issues/:issueId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM project_issues WHERE id=$1 AND project_id=$2',
      [req.params.issueId, req.params.projectId]
    );
    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// File Upload Routes (storage still goes through Supabase Storage SDK)
// ---------------------------------------------------------------------------
app.post('/api/upload/change-request-attachment', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File size exceeds the maximum limit of 10MB' });
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const file = req.file;
      const filePath = `${Date.now()}-${file.originalname}`;
      const { data, error } = await supabase.storage
        .from('change-request-attachments')
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) return res.status(400).json({ error: error.message });
      const { data: publicUrlData } = supabase.storage.from('change-request-attachments').getPublicUrl(filePath);
      res.json({
        message: 'File uploaded successfully',
        data: { path: data.path, fullPath: data.fullPath, url: publicUrlData.publicUrl, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype },
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/download/change-request-attachment/:filePath(*)', async (req, res) => {
  try {
    const { data, error } = await supabase.storage.from('change-request-attachments').download(req.params.filePath);
    if (error) return res.status(404).json({ error: 'File not found' });
    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader('Content-Type', data.type);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(req.params.filePath)}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/delete/change-request-attachment/:filePath(*)', async (req, res) => {
  try {
    const { error } = await supabase.storage.from('change-request-attachments').remove([req.params.filePath]);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Change Requests Routes
// ---------------------------------------------------------------------------
app.get('/api/projects/:projectId/change-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM change_requests WHERE project_id=$1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/change-requests', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, type, description, justification, scope_impact, cost_impact, risk_impact, resource_impact, attachments } = req.body;
    if (!title?.trim() || !description?.trim() || !justification?.trim()) {
      return res.status(400).json({ error: 'Title, description, and justification are required' });
    }
    if (!['Scope Change', 'Schedule Change', 'Budget Change', 'Resource Change', 'Quality Change'].includes(type)) {
      return res.status(400).json({ error: 'Invalid change request type' });
    }
    if (!['Low', 'Medium', 'High'].includes(scope_impact)) return res.status(400).json({ error: 'Invalid scope impact level' });
    if (!['Low', 'Medium', 'High'].includes(risk_impact)) return res.status(400).json({ error: 'Invalid risk impact level' });
    if (!['Low', 'Medium', 'High'].includes(resource_impact)) return res.status(400).json({ error: 'Invalid resource impact level' });

    const { rows } = await pool.query(
      `INSERT INTO change_requests (project_id, title, type, description, justification, scope_impact, cost_impact, risk_impact, resource_impact, attachments, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending Review') RETURNING *`,
      [projectId, title.trim(), type, description.trim(), justification.trim(), scope_impact, cost_impact ? cost_impact.trim() : null, risk_impact, resource_impact, attachments ? attachments.trim() : null]
    );
    res.status(201).json({ message: 'Change request created successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/change-requests/:changeRequestId', async (req, res) => {
  try {
    const { projectId, changeRequestId } = req.params;
    const { title, type, description, justification, scope_impact, cost_impact, risk_impact, resource_impact, attachments, status } = req.body;
    const { rows } = await pool.query(
      `UPDATE change_requests SET title=$1, type=$2, description=$3, justification=$4, scope_impact=$5,
       cost_impact=$6, risk_impact=$7, resource_impact=$8, attachments=$9, status=$10, updated_at=now()
       WHERE id=$11 AND project_id=$12 RETURNING *`,
      [title, type, description, justification, scope_impact, cost_impact, risk_impact, resource_impact, attachments, status, changeRequestId, projectId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Change request not found' });
    res.json({ message: 'Change request updated successfully', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/change-requests/:changeRequestId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM change_requests WHERE id=$1 AND project_id=$2',
      [req.params.changeRequestId, req.params.projectId]
    );
    res.json({ message: 'Change request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Project Documents Routes
// ---------------------------------------------------------------------------
app.post('/api/projects/:projectId/documents/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File size exceeds the maximum limit of 10MB' });
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const { projectId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadError) return res.status(400).json({ error: uploadError.message });
      const { rows } = await pool.query(
        `INSERT INTO project_documents (project_id, file_name, file_path, file_size, mime_type)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [projectId, file.originalname, fileName, file.size, file.mimetype]
      );
      res.status(201).json({ message: 'Document uploaded successfully', data: rows[0] });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/projects/:projectId/documents', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_documents WHERE project_id=$1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/download/project-document/:path', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_documents WHERE file_path=$1',
      [req.params.path]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const document = rows[0];
    const { data, error } = await supabase.storage.from('project-documents').download(req.params.path);
    if (error) return res.status(404).json({ error: 'File not found in storage' });
    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/documents/:documentId', async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    const { rows } = await pool.query(
      'SELECT file_path FROM project_documents WHERE id=$1 AND project_id=$2',
      [documentId, projectId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    await supabase.storage.from('project-documents').remove([rows[0].file_path]);
    await pool.query('DELETE FROM project_documents WHERE id=$1', [documentId]);
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Budget Routes
// ---------------------------------------------------------------------------
app.get('/api/projects/:projectId/budgets', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM project_budgets WHERE project_id=$1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/budgets', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'INSERT INTO project_budgets (project_id, categories) VALUES ($1,$2) RETURNING *',
      [req.params.projectId, req.body.categories || []]
    );
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/budgets/:budgetId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE project_budgets SET categories=$1, updated_at=now() WHERE id=$2 RETURNING *',
      [req.body.categories || [], req.params.budgetId]
    );
    res.json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/budgets/:budgetId', async (req, res) => {
  try {
    await pool.query('DELETE FROM project_budgets WHERE id=$1', [req.params.budgetId]);
    res.status(200).json({ success: true, message: 'Budget item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Cost Category helper
// ---------------------------------------------------------------------------
app.get('/api/custom-fields/cost-category', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT options FROM custom_fields WHERE field_name='Cost Category' LIMIT 1"
    );
    if (rows.length === 0) {
      return res.json({ options: ['Labor', 'Materials', 'Equipment', 'Software', 'Travel', 'Other'] });
    }
    res.json({ options: rows[0].options || [] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'AlignEx API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
