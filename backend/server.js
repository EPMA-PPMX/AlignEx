const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

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
  'application/zip'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported. Allowed types: PDF, Word, Excel, PowerPoint, Images (JPG, PNG, GIF), Text, ZIP`), false);
    }
  }
});

// Debug: Log environment variables (remove in production)
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');

// Middleware
app.use(cors());
app.use(express.json());

// Check for required environment variables
/* if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_URL === "https://qdlfmxsvqjvtezdyoxka.supabase.co" || 
    process.env.SUPABASE_SERVICE_ROLE_KEY === "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkbGZteHN2cWp2dGV6ZHlveGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxNjU4MywiZXhwIjoyMDcyOTkyNTgzfQ.s6GxyuOpqYeD-jOI1EPo9WmjTz_mBo7FM7yBPIQp6B8") {
  console.error('Error: Missing required environment variables.');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file with actual values from your Supabase dashboard');
  console.error('Current SUPABASE_URL:', process.env.SUPABASE_URL);
  process.exit(1);
} */

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Custom Fields Routes
app.get('/api/custom-fields', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/custom-fields', async (req, res) => {
  try {
    const {
      field_name,
      field_type,
      field_label,
      is_required,
      default_value,
      options
    } = req.body;

    // Validation
    if (!field_name || !field_type || !field_label) {
      return res.status(400).json({ 
        error: 'Field name, type, and label are required' 
      });
    }

    const validTypes = ['text', 'number', 'email', 'date', 'dropdown', 'radio', 'checkbox', 'textarea'];
    if (!validTypes.includes(field_type)) {
      return res.status(400).json({ 
        error: 'Invalid field type' 
      });
    }

    const { data, error } = await supabase
      .from('custom_fields')
      .insert([{
        field_name,
        field_type,
        field_label,
        is_required: is_required || false,
        default_value: default_value || null,
        options: options || null
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Custom field created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      field_name,
      field_type,
      field_label,
      is_required,
      default_value,
      options
    } = req.body;

    const { data, error } = await supabase
      .from('custom_fields')
      .update({
        field_name,
        field_type,
        field_label,
        is_required,
        default_value,
        options,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Custom field not found' });
    }

    res.json({ 
      message: 'Custom field updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('custom_fields')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Custom field deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Projects Routes
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, template_id } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Project name is required' 
      });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        name: name.trim(),
        description: description ? description.trim() : null,
        template_id: template_id || null,
        status: 'In-Progress'
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Project created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Templates Routes
app.get('/api/project-templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/project-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('project_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Project template not found' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/project-templates', async (req, res) => {
  try {
    const { template_name, template_description } = req.body;

    // Validation
    if (!template_name || !template_name.trim()) {
      return res.status(400).json({ 
        error: 'Template name is required' 
      });
    }

    const { data, error } = await supabase
      .from('project_templates')
      .insert([{
        template_name: template_name.trim(),
        template_description: template_description ? template_description.trim() : null
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Project template created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/project-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { template_name, template_description } = req.body;

    const { data, error } = await supabase
      .from('project_templates')
      .update({
        template_name,
        template_description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Project template not found' });
    }

    res.json({ 
      message: 'Project template updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/project-templates/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('project_templates')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Project template deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Overview Configurations Routes
app.get('/api/overview-configurations/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const { data, error } = await supabase
      .from('overview_configurations')
      .select('*')
      .eq('template_id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/overview-configurations', async (req, res) => {
  try {
    const { template_id, sections } = req.body;

    // Validation
    if (!template_id || !sections) {
      return res.status(400).json({ 
        error: 'Template ID and sections are required' 
      });
    }

    // Check if configuration already exists for this template
    const { data: existing } = await supabase
      .from('overview_configurations')
      .select('id')
      .eq('template_id', template_id)
      .single();

    let result;
    if (existing) {
      // Update existing configuration
      const { data, error } = await supabase
        .from('overview_configurations')
        .update({
          sections,
          updated_at: new Date().toISOString()
        })
        .eq('template_id', template_id)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      result = { data: data[0], message: 'Configuration updated successfully' };
    } else {
      // Create new configuration
      const { data, error } = await supabase
        .from('overview_configurations')
        .insert([{
          template_id,
          sections
        }])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      result = { data: data[0], message: 'Configuration created successfully' };
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

    const { data, error } = await supabase
      .from('overview_configurations')
      .update({
        sections,
        updated_at: new Date().toISOString()
      })
      .eq('template_id', templateId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ 
      message: 'Configuration updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/overview-configurations/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;

    const { error } = await supabase
      .from('overview_configurations')
      .delete()
      .eq('template_id', templateId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Configuration deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Field Values Routes
app.get('/api/projects/:projectId/field-values', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('project_field_values')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
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

    // Convert fieldValues object to array of records
    const records = Object.entries(fieldValues).map(([fieldId, value]) => ({
      project_id: projectId,
      field_id: fieldId,
      field_value: value
    }));

    if (records.length === 0) {
      return res.status(400).json({ error: 'No field values provided' });
    }

    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('project_field_values')
      .upsert(records, { 
        onConflict: 'project_id,field_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Field values saved successfully',
      data 
    });
  } catch (err) {
    console.error('Error saving field values:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/field-values/:fieldId', async (req, res) => {
  try {
    const { projectId, fieldId } = req.params;
    const { field_value } = req.body;

    const { data, error } = await supabase
      .from('project_field_values')
      .upsert({
        project_id: projectId,
        field_id: fieldId,
        field_value: field_value,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'project_id,field_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Field value updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/field-values/:fieldId', async (req, res) => {
  try {
    const { projectId, fieldId } = req.params;

    const { error } = await supabase
      .from('project_field_values')
      .delete()
      .eq('project_id', projectId)
      .eq('field_id', fieldId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Field value deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Risks Routes
app.get('/api/projects/:projectId/risks', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('project_risks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/risks', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, impact, type, status } = req.body;

    // Validation
    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ 
        error: 'Risk title and description are required' 
      });
    }

    if (!['Critical', 'High', 'Medium'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid risk type' 
      });
    }

    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid risk status' 
      });
    }

    const { data, error } = await supabase
      .from('project_risks')
      .insert([{
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        impact: impact ? impact.trim() : null,
        type,
        status
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Risk created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/risks/:riskId', async (req, res) => {
  try {
    const { projectId, riskId } = req.params;
    const { title, description, impact, type, status } = req.body;

    const { data, error } = await supabase
      .from('project_risks')
      .update({
        title,
        description,
        impact,
        type,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', riskId)
      .eq('project_id', projectId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json({ 
      message: 'Risk updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/risks/:riskId', async (req, res) => {
  try {
    const { projectId, riskId } = req.params;

    const { error } = await supabase
      .from('project_risks')
      .delete()
      .eq('id', riskId)
      .eq('project_id', projectId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Risk deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Issues Routes
app.get('/api/projects/:projectId/issues', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('project_issues')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/issues', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, impact, type, status } = req.body;

    // Validation
    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ 
        error: 'Issue title and description are required' 
      });
    }

    if (!['Critical', 'High', 'Medium'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid issue type' 
      });
    }

    if (!['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid issue status' 
      });
    }

    const { data, error } = await supabase
      .from('project_issues')
      .insert([{
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        impact: impact ? impact.trim() : null,
        type,
        status
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Issue created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/issues/:issueId', async (req, res) => {
  try {
    const { projectId, issueId } = req.params;
    const { title, description, impact, type, status } = req.body;

    const { data, error } = await supabase
      .from('project_issues')
      .update({
        title,
        description,
        impact,
        type,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', issueId)
      .eq('project_id', projectId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ 
      message: 'Issue updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/issues/:issueId', async (req, res) => {
  try {
    const { projectId, issueId } = req.params;

    const { error } = await supabase
      .from('project_issues')
      .delete()
      .eq('id', issueId)
      .eq('project_id', projectId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File Upload Routes
app.post('/api/upload/change-request-attachment', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the maximum limit of 10MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('change-request-attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        return res.status(400).json({ error: error.message });
      }

      const { data: publicUrlData } = supabase.storage
        .from('change-request-attachments')
        .getPublicUrl(filePath);

      res.json({
        message: 'File uploaded successfully',
        data: {
          path: data.path,
          fullPath: data.fullPath,
          url: publicUrlData.publicUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype
        }
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/download/change-request-attachment/:filePath(*)', async (req, res) => {
  try {
    const { filePath } = req.params;

    const { data, error } = await supabase.storage
      .from('change-request-attachments')
      .download(filePath);

    if (error) {
      return res.status(404).json({ error: 'File not found' });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    res.setHeader('Content-Type', data.type);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/delete/change-request-attachment/:filePath(*)', async (req, res) => {
  try {
    const { filePath } = req.params;
    console.log('Attempting to delete file:', filePath);

    const { data, error } = await supabase.storage
      .from('change-request-attachments')
      .remove([filePath]);

    if (error) {
      console.error('Delete error from Supabase:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('File deleted successfully:', data);
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change Requests Routes
app.get('/api/projects/:projectId/change-requests', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('change_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/change-requests', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      title, 
      type, 
      description, 
      justification, 
      scope_impact, 
      cost_impact, 
      risk_impact, 
      resource_impact, 
      attachments 
    } = req.body;

    // Validation
    if (!title || !title.trim() || !description || !description.trim() || !justification || !justification.trim()) {
      return res.status(400).json({ 
        error: 'Title, description, and justification are required' 
      });
    }

    if (!['Scope Change', 'Schedule Change', 'Budget Change', 'Resource Change', 'Quality Change'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid change request type' 
      });
    }

    if (!['Low', 'Medium', 'High'].includes(scope_impact)) {
      return res.status(400).json({ 
        error: 'Invalid scope impact level' 
      });
    }

    if (!['Low', 'Medium', 'High'].includes(risk_impact)) {
      return res.status(400).json({ 
        error: 'Invalid risk impact level' 
      });
    }

    if (!['Low', 'Medium', 'High'].includes(resource_impact)) {
      return res.status(400).json({ 
        error: 'Invalid resource impact level' 
      });
    }

    const { data, error } = await supabase
      .from('change_requests')
      .insert([{
        project_id: projectId,
        title: title.trim(),
        type,
        description: description.trim(),
        justification: justification.trim(),
        scope_impact,
        cost_impact: cost_impact ? cost_impact.trim() : null,
        risk_impact,
        resource_impact,
        attachments: attachments ? attachments.trim() : null,
        status: 'Pending Review'
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Change request created successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/change-requests/:changeRequestId', async (req, res) => {
  try {
    const { projectId, changeRequestId } = req.params;
    const { 
      title, 
      type, 
      description, 
      justification, 
      scope_impact, 
      cost_impact, 
      risk_impact, 
      resource_impact, 
      attachments,
      status
    } = req.body;

    const { data, error } = await supabase
      .from('change_requests')
      .update({
        title,
        type,
        description,
        justification,
        scope_impact,
        cost_impact,
        risk_impact,
        resource_impact,
        attachments,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', changeRequestId)
      .eq('project_id', projectId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json({ 
      message: 'Change request updated successfully',
      data: data[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/change-requests/:changeRequestId', async (req, res) => {
  try {
    const { projectId, changeRequestId } = req.params;

    const { error } = await supabase
      .from('change_requests')
      .delete()
      .eq('id', changeRequestId)
      .eq('project_id', projectId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Change request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Project Documents Routes
app.post('/api/projects/:projectId/documents/upload', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the maximum limit of 10MB' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { projectId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.originalname}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return res.status(400).json({ error: uploadError.message });
      }

      const { data: documentData, error: dbError } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId,
          file_name: file.originalname,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.mimetype
        }])
        .select();

      if (dbError) {
        console.error('Database error:', dbError);
        await supabase.storage.from('project-documents').remove([fileName]);
        return res.status(400).json({ error: dbError.message });
      }

      res.status(201).json({
        message: 'Document uploaded successfully',
        data: documentData[0]
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/projects/:projectId/documents', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/download/project-document/:path', async (req, res) => {
  try {
    const { path } = req.params;

    const { data: document, error: docError } = await supabase
      .from('project_documents')
      .select('*')
      .eq('file_path', path)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { data, error } = await supabase.storage
      .from('project-documents')
      .download(path);

    if (error) {
      console.error('Download error:', error);
      return res.status(404).json({ error: 'File not found in storage' });
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/documents/:documentId', async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    console.log('Deleting document:', { projectId, documentId });

    const { data: document, error: fetchError } = await supabase
      .from('project_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(400).json({ error: fetchError.message });
    }

    if (!document) {
      console.error('Document not found');
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log('Deleting from storage:', document.file_path);
    const { error: storageError } = await supabase.storage
      .from('project-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    } else {
      console.log('File deleted from storage successfully');
    }

    console.log('Deleting from database');
    const { error: dbError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return res.status(400).json({ error: dbError.message });
    }

    console.log('Document deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Budget endpoints
app.get('/api/projects/:projectId/budgets', async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data, error } = await supabase
      .from('project_budgets')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/projects/:projectId/budgets', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { categories } = req.body;

    const { data, error } = await supabase
      .from('project_budgets')
      .insert([{
        project_id: projectId,
        categories: categories || []
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ data: data[0] });
  } catch (err) {
    console.error('Error creating budget:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/projects/:projectId/budgets/:budgetId', async (req, res) => {
  try {
    const { budgetId } = req.params;
    const { categories } = req.body;

    const { data, error } = await supabase
      .from('project_budgets')
      .update({
        categories: categories || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', budgetId)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ data: data[0] });
  } catch (err) {
    console.error('Error updating budget:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/projects/:projectId/budgets/:budgetId', async (req, res) => {
  try {
    const { budgetId } = req.params;

    const { error } = await supabase
      .from('project_budgets')
      .delete()
      .eq('id', budgetId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(200).json({
      success: true,
      message: 'Budget item deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting budget:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get Cost Category field options
app.get('/api/custom-fields/cost-category', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('custom_fields')
      .select('options')
      .eq('field_name', 'Cost Category')
      .maybeSingle();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.json({ options: ['Labor', 'Materials', 'Equipment', 'Software', 'Travel', 'Other'] });
    }

    res.json({ options: data.options || [] });
  } catch (err) {
    console.error('Error fetching cost category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'EPMASenseWork API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});