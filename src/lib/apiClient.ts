/**
 * Drop-in replacement for the Supabase JS client.
 * Routes all database queries through the backend /api/query endpoint.
 * Returns { data, error } tuples identical to the Supabase client shape.
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || '';

interface Filter {
  field: string;
  operator: string;
  value: unknown;
}

interface OrderClause {
  column: string;
  ascending: boolean;
}

interface UpsertOptions {
  onConflict: string;
  ignoreDuplicates?: boolean;
}

interface QueryDescriptor {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  columns?: string;
  filters?: Filter[];
  order?: OrderClause;
  limit?: number;
  data?: unknown;
  upsertOptions?: UpsertOptions;
  single?: boolean;
  count?: string;
}

async function executeQuery(descriptor: QueryDescriptor): Promise<{ data: unknown; error: unknown; count?: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(descriptor),
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error || { message: 'Request failed' } };

    const rows = json.data as unknown[];
    if (descriptor.single) {
      return { data: rows[0] ?? null, error: null };
    }
    if (descriptor.count) {
      return { data: rows, error: null, count: rows.length };
    }
    return { data: rows, error: null };
  } catch (err: unknown) {
    return { data: null, error: { message: (err as Error).message } };
  }
}

// ---------------------------------------------------------------------------
// Fluent query builder — mirrors the Supabase JS client's chainable API
// ---------------------------------------------------------------------------
class QueryBuilder {
  private descriptor: QueryDescriptor;

  constructor(table: string, operation: QueryDescriptor['operation']) {
    this.descriptor = { table, operation };
  }

  // Column selection
  select(columns = '*', options?: { count?: 'exact' }) {
    this.descriptor.columns = columns;
    if (options?.count) this.descriptor.count = options.count;
    return this as QueryBuilderSelect;
  }

  // Data payload for insert / update / upsert
  private _data(data: unknown) {
    this.descriptor.data = data;
    return this;
  }

  // Filters
  eq(field: string, value: unknown) {
    this._addFilter(field, 'eq', value);
    return this;
  }
  neq(field: string, value: unknown) {
    this._addFilter(field, 'neq', value);
    return this;
  }
  gt(field: string, value: unknown) {
    this._addFilter(field, 'gt', value);
    return this;
  }
  gte(field: string, value: unknown) {
    this._addFilter(field, 'gte', value);
    return this;
  }
  lt(field: string, value: unknown) {
    this._addFilter(field, 'lt', value);
    return this;
  }
  lte(field: string, value: unknown) {
    this._addFilter(field, 'lte', value);
    return this;
  }
  like(field: string, value: unknown) {
    this._addFilter(field, 'like', value);
    return this;
  }
  ilike(field: string, value: unknown) {
    this._addFilter(field, 'ilike', value);
    return this;
  }
  in(field: string, value: unknown[]) {
    this._addFilter(field, 'in', value);
    return this;
  }
  is(field: string, value: unknown) {
    this._addFilter(field, 'is', value);
    return this;
  }
  not(field: string, operator: string, value: unknown) {
    this._addFilter(field, 'not', { operator, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.descriptor.order = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this.descriptor.limit = n;
    return this;
  }

  single() {
    this.descriptor.single = true;
    return this.then.bind(this) as unknown as PromiseLike<{ data: unknown; error: unknown }>;
  }

  maybeSingle() {
    this.descriptor.single = true;
    return this;
  }

  private _addFilter(field: string, operator: string, value: unknown) {
    if (!this.descriptor.filters) this.descriptor.filters = [];
    this.descriptor.filters.push({ field, operator, value });
  }

  then<TResult>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count?: number }) => TResult) | null
  ): Promise<TResult> {
    return executeQuery(this.descriptor).then(onfulfilled ?? (v => v as unknown as TResult));
  }
}

// Select builder also allows chaining after insert/upsert
class QueryBuilderSelect extends QueryBuilder {
  // already inherits everything
}

class InsertBuilder extends QueryBuilder {
  select(columns = '*') {
    (this as unknown as { descriptor: QueryDescriptor }).descriptor.columns = columns;
    return this;
  }
}

class UpsertBuilder extends QueryBuilder {
  select(columns = '*') {
    (this as unknown as { descriptor: QueryDescriptor }).descriptor.columns = columns;
    return this;
  }
}

// ---------------------------------------------------------------------------
// Table proxy — supabase.from('table')
// ---------------------------------------------------------------------------
class TableProxy {
  constructor(private table: string) {}

  select(columns = '*', options?: { count?: 'exact' }) {
    const qb = new QueryBuilder(this.table, 'select');
    return qb.select(columns, options);
  }

  insert(data: unknown) {
    const qb = new QueryBuilder(this.table, 'insert') as unknown as InsertBuilder & { descriptor: QueryDescriptor };
    qb.descriptor.data = data;
    return qb;
  }

  upsert(data: unknown, options?: UpsertOptions) {
    const qb = new QueryBuilder(this.table, 'upsert') as unknown as UpsertBuilder & { descriptor: QueryDescriptor };
    qb.descriptor.data = data;
    if (options) qb.descriptor.upsertOptions = options;
    return qb;
  }

  update(data: unknown) {
    const qb = new QueryBuilder(this.table, 'update') as unknown as QueryBuilder & { descriptor: QueryDescriptor };
    qb.descriptor.data = data;
    return qb;
  }

  delete() {
    return new QueryBuilder(this.table, 'delete');
  }
}

// ---------------------------------------------------------------------------
// Storage proxy — supabase.storage.from('bucket')
// ---------------------------------------------------------------------------
class StorageBucketProxy {
  constructor(private bucket: string) {}

  async upload(path: string, file: File | Blob, options?: { contentType?: string; upsert?: boolean }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', this.bucket);
    formData.append('path', path);
    if (options?.contentType) formData.append('contentType', options.contentType);

    const endpoint = this.bucket === 'change-request-attachments'
      ? `${API_BASE}/api/upload/change-request-attachment`
      : `${API_BASE}/api/projects/documents/upload-raw`;

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.error || { message: 'Upload failed' } };
      return { data: json.data, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: (err as Error).message } };
    }
  }

  async download(path: string) {
    const endpoint = this.bucket === 'change-request-attachments'
      ? `${API_BASE}/api/download/change-request-attachment/${encodeURIComponent(path)}`
      : `${API_BASE}/api/download/project-document/${encodeURIComponent(path)}`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        return { data: null, error: json.error || { message: 'Download failed' } };
      }
      const blob = await res.blob();
      return { data: blob, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: (err as Error).message } };
    }
  }

  async remove(paths: string[]) {
    try {
      const results = await Promise.all(paths.map(async (p) => {
        const endpoint = this.bucket === 'change-request-attachments'
          ? `${API_BASE}/api/delete/change-request-attachment/${encodeURIComponent(p)}`
          : `${API_BASE}/api/delete/project-document/${encodeURIComponent(p)}`;
        const res = await fetch(endpoint, { method: 'DELETE' });
        return res.ok;
      }));
      return { data: results, error: null };
    } catch (err: unknown) {
      return { data: null, error: { message: (err as Error).message } };
    }
  }

  getPublicUrl(path: string) {
    const url = this.bucket === 'change-request-attachments'
      ? `${API_BASE}/api/download/change-request-attachment/${encodeURIComponent(path)}`
      : `${API_BASE}/api/download/project-document/${encodeURIComponent(path)}`;
    return { data: { publicUrl: url } };
  }
}

class StorageProxy {
  from(bucket: string) {
    return new StorageBucketProxy(bucket);
  }
}

// ---------------------------------------------------------------------------
// Main client export
// ---------------------------------------------------------------------------
class ApiClient {
  readonly storage = new StorageProxy();

  from(table: string) {
    return new TableProxy(table);
  }
}

export const apiClient = new ApiClient();
