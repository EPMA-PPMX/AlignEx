/**
 * Authentication & Authorization Middleware
 *
 * Implements MS Project Server-style security:
 * - Authentication: validates Entra ID (MSAL) JWT tokens in production,
 *   falls back to a dev-mode header for local development.
 * - Authorization: builds an auth context with the user's identity, system role,
 *   tenant, and resource_id. Provides project visibility filtering and
 *   per-project permission checks.
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const AUTH_MODE = process.env.AUTH_MODE || 'dev'; // 'dev' | 'entra'
const ENTRA_TENANT_ID = process.env.ENTRA_TENANT_ID || '';
const ENTRA_AUDIENCE = process.env.ENTRA_AUDIENCE || ''; // expected audience (client ID or API URI)
const DEV_USER_ID = process.env.DEV_USER_ID || '53eaeaf7-b9ab-47be-be4b-9e6f57a81dea';

// JWKS client for Entra ID token validation (lazy-initialized)
let entraJwksClient = null;

function getJwksClient() {
  if (entraJwksClient) return entraJwksClient;
  if (!ENTRA_TENANT_ID) {
    throw new Error('ENTRA_TENANT_ID is required when AUTH_MODE=entra');
  }
  entraJwksClient = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${ENTRA_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });
  return entraJwksClient;
}

/**
 * Get the signing key for a given kid from Entra ID's JWKS endpoint.
 */
function getSigningKey(header) {
  return new Promise((resolve, reject) => {
    const client = getJwksClient();
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Validate an Entra ID JWT access token.
 * Returns the decoded token payload (contains claims like email, oid, etc.).
 */
async function validateEntraToken(token) {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader) {
    throw new Error('Invalid token format');
  }

  const signingKey = await getSigningKey(decodedHeader.header);

  const verifyOptions = {
    algorithms: ['RS256'],
    issuer: `https://sts.windows.net/${ENTRA_TENANT_ID}/`,
  };
  if (ENTRA_AUDIENCE) {
    verifyOptions.audience = ENTRA_AUDIENCE;
  }

  const payload = jwt.verify(token, signingKey, verifyOptions);
  return payload;
}

/**
 * Extract the user's email from an Entra ID token payload.
 * Entra ID tokens may use 'email', 'preferred_username', or 'upn' claim.
 */
function extractEmailFromToken(payload) {
  return (
    payload.email ||
    payload.preferred_username ||
    payload.upn ||
    (payload.unique_name && payload.unique_name) ||
    null
  );
}

/**
 * Look up a user in the database by email.
 * Returns the full user row including system_role, resource_id, tenant_name.
 */
async function lookupUserByEmail(pool, email) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, system_role, resource_id, avatar_url, is_active, tenant_name
     FROM users WHERE email = $1 AND is_active = true`,
    [email]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Look up a user in the database by id (for dev mode).
 */
async function lookupUserById(pool, userId) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, system_role, resource_id, avatar_url, is_active, tenant_name
     FROM users WHERE id = $1`,
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that authenticates the incoming request.
 *
 * In 'dev' mode: reads the user ID from the X-Dev-User-Id header (or falls back
 * to DEV_USER_ID env var) and looks up the user in the database.
 *
 * In 'entra' mode: reads the Bearer token from the Authorization header,
 * validates it against Entra ID's JWKS endpoint, extracts the email claim,
 * and looks up the matching user in the database.
 *
 * On success, attaches req.user with the full user object.
 * On failure, returns 401.
 */
async function authMiddleware(pool) {
  return async (req, res, next) => {
    try {
      let user;

      if (AUTH_MODE === 'entra') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: { message: 'Missing or invalid Authorization header' } });
        }
        const token = authHeader.substring(7);
        const payload = await validateEntraToken(token);
        const email = extractEmailFromToken(payload);
        if (!email) {
          return res.status(401).json({ error: { message: 'Token does not contain a recognizable email claim' } });
        }
        user = await lookupUserByEmail(pool, email);
        if (!user) {
          return res.status(403).json({ error: { message: `No active user found for email: ${email}` } });
        }
      } else {
        // Dev mode: use header or default
        const devUserId = req.headers['x-dev-user-id'] || DEV_USER_ID;
        user = await lookupUserById(pool, devUserId);
        if (!user) {
          return res.status(401).json({ error: { message: `Dev user not found: ${devUserId}` } });
        }
      }

      req.user = user;
      next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: { message: `Token validation failed: ${err.message}` } });
      }
      console.error('[authMiddleware] error:', err.message);
      return res.status(500).json({ error: { message: 'Authentication error' } });
    }
  };
}

// ---------------------------------------------------------------------------
// Authorization Engine
// ---------------------------------------------------------------------------

/**
 * Build the authorization context for the authenticated user.
 * This is the "who am I and what can I do globally" object.
 */
function buildAuthContext(user) {
  const systemRole = user.system_role;
  const isGlobalAdmin = systemRole === 'Admin';
  const isPortfolioManager = systemRole === 'Portfolio Manager';

  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    systemRole,
    resourceId: user.resource_id,
    tenantName: user.tenant_name,
    isGlobalAdmin,
    isPortfolioManager,
    // Admins and Portfolio Managers see all tenant projects (like MS Project Server's "All Projects" category)
    seesAllProjects: isGlobalAdmin || isPortfolioManager,
  };
}

/**
 * Project-scoped tables — tables that have a project_id column (or ARE the projects table).
 * Queries against these tables get visibility filtering injected.
 */
const PROJECT_TABLES = new Set([
  'projects',
  'project_risks',
  'project_issues',
  'project_tasks',
  'project_budgets',
  'change_requests',
  'project_documents',
  'project_team_members',
  'project_field_values',
  'monthly_benefit_tracking',
  'status_reports',
  'action_items',
  'task_resource_assignments',
  'budget_forecast_monthly',
]);

// Map each project-child table to its project_id column name
const PROJECT_ID_COLUMN = {
  projects: 'id',
  project_risks: 'project_id',
  project_issues: 'project_id',
  project_tasks: 'project_id',
  project_budgets: 'project_id',
  change_requests: 'project_id',
  project_documents: 'project_id',
  project_team_members: 'project_id',
  project_field_values: 'project_id',
  monthly_benefit_tracking: 'project_id',
  status_reports: 'project_id',
  action_items: 'project_id',
  task_resource_assignments: 'project_id',
  budget_forecast_monthly: 'project_id',
};

// Tables that have a tenant_name column for tenant isolation.
// NOTE: 'projects' and 'project_team_members' are NOT here because
// visibility is handled by PROJECT_TABLES (owner_id + team membership).
// Tenant filtering on those tables would incorrectly hide cross-tenant projects.
const TENANT_TABLES = new Set([
  'users',
  'resources',
  'organization_team_members',
  'project_initiation_requests',
  'security_categories',
]);

/**
 * Get the set of project IDs the current user can see.
 *
 * Logic:
 * 1. If seesAllProjects → all projects in the tenant
 * 2. Otherwise → projects where owner_id = userId OR user is a team member,
 *    regardless of project tenant_name (users can be on cross-tenant projects)
 *
 * Returns an array of UUIDs (empty array means no access to any project).
 */
async function getVisibleProjectIds(pool, authCtx) {
  if (authCtx.seesAllProjects) {
    // Admins and Portfolio Managers see all projects across all tenants
    const { rows } = await pool.query('SELECT id FROM projects');
    return rows.map(r => r.id);
  }

  // Projects owned by the user + projects where user is a team member
  // No tenant filter here — users may be team members on cross-tenant projects
  const { rows } = await pool.query(
    `SELECT DISTINCT p.id
     FROM projects p
     LEFT JOIN project_team_members ptm ON ptm.project_id = p.id
     WHERE p.owner_id = $1 OR ptm.resource_id = $2`,
    [authCtx.userId, authCtx.resourceId]
  );
  return rows.map(r => r.id);
}

/**
 * Get the user's permissions for a specific project.
 *
 * Logic:
 * 1. If seesAllProjects → all permissions (full access)
 * 2. If owner_id = userId → all permissions (owner has full access)
 * 3. If team member → look up role, then query project_role_permissions
 * 4. Otherwise → empty set (no access)
 *
 * Returns a Set of permission_key strings.
 */
async function getProjectPermissions(pool, authCtx, projectId) {
  // Check if user is owner or global admin/PM
  // No tenant filter — user may be a team member on a cross-tenant project
  const { rows } = await pool.query(
    `SELECT p.owner_id, ptm.role
     FROM projects p
     LEFT JOIN project_team_members ptm ON ptm.project_id = p.id AND ptm.resource_id = $2
     WHERE p.id = $1`,
    [projectId, authCtx.resourceId]
  );

  if (rows.length === 0) {
    return new Set(); // project doesn't exist
  }

  const project = rows[0];

  // Admins, Portfolio Managers, and project owners get all permissions
  if (authCtx.seesAllProjects || project.owner_id === authCtx.userId) {
    const { rows: allPerms } = await pool.query(
      `SELECT DISTINCT permission_key FROM project_role_permissions WHERE can_execute = true`
    );
    return new Set(allPerms.map(r => r.permission_key));
  }

  // Team member: look up permissions for their role
  if (project.role) {
    const { rows: rolePerms } = await pool.query(
      `SELECT permission_key FROM project_role_permissions
       WHERE role_name = $1 AND can_execute = true`,
      [project.role]
    );
    return new Set(rolePerms.map(r => r.permission_key));
  }

  return new Set(); // no role, no access
}

/**
 * Check if the user has a specific permission on a project.
 * Returns true/false.
 */
async function hasProjectPermission(pool, authCtx, projectId, permissionKey) {
  const perms = await getProjectPermissions(pool, authCtx, projectId);
  return perms.has(permissionKey);
}

/**
 * Maps a table + operation to the required permission key.
 * Returns null if no specific permission is needed (e.g. SELECT just needs visibility).
 */
function getRequiredPermission(table, operation) {
  if (operation === 'select') return null; // visibility filter handles reads

  // Map tables to the permission key needed for write operations
  const tablePermMap = {
    'projects': 'project.edit_details',
    'project_tasks': 'project.edit_schedule',
    'project_budgets': 'project.edit_budget',
    'budget_forecast_monthly': 'project.edit_budget',
    'change_requests': 'project.approve_changes',
    'project_risks': 'project.edit_risks',
    'project_issues': 'project.edit_issues',
    'project_documents': 'project.upload_documents',
    'project_team_members': 'project.manage_team',
    'status_reports': 'project.create_status_report',
  };

  return tablePermMap[table] || null;
}

/**
 * Extract the project_id from a query descriptor (for write operations on child tables).
 */
function extractProjectId(descriptor) {
  const { table, operation, data, filters } = descriptor;

  // For the projects table itself, the ID is in filters (update/delete) or data (insert)
  if (table === 'projects') {
    if (operation === 'insert' && data) {
      return data.id || null; // new project, no project_id check needed
    }
    // For update/delete, find the id filter
    if (filters) {
      const idFilter = filters.find(f => f.field === 'id');
      if (idFilter) return idFilter.value;
    }
    return null;
  }

  // For child tables, project_id may be in data (insert/upsert) or filters (update/delete)
  if (data) {
    const rowData = Array.isArray(data) ? data[0] : data;
    if (rowData && rowData.project_id) return rowData.project_id;
  }
  if (filters) {
    const pidFilter = filters.find(f => f.field === 'project_id');
    if (pidFilter) return pidFilter.value;
  }

  return null;
}

module.exports = {
  authMiddleware,
  buildAuthContext,
  getVisibleProjectIds,
  getProjectPermissions,
  hasProjectPermission,
  getRequiredPermission,
  extractProjectId,
  PROJECT_TABLES,
  PROJECT_ID_COLUMN,
  TENANT_TABLES,
};
