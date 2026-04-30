const API_BASE = '/api';

type FilterOperator = 'eq' | 'neq' | 'like' | 'ilike' | 'in' | 'not' | 'gte' | 'lte' | 'gt' | 'lt' | 'is';

interface Filter {
  operator: FilterOperator;
  field: string;
  value: unknown;
}

interface OrderClause {
  column: string;
  ascending: boolean;
}

type QueryOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

class QueryBuilder {
  private _table: string;
  private _operation: QueryOperation = 'select';
  private _columns: string = '*';
  private _filters: Filter[] = [];
  private _order: OrderClause | null = null;
  private _limitCount: number | null = null;
  private _singleRow: boolean = false;
  private _maybeSingleRow: boolean = false;
  private _data: unknown = null;
  private _upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } = {};

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*'): this {
    this._operation = 'select';
    this._columns = columns;
    return this;
  }

  insert(data: unknown): this {
    this._operation = 'insert';
    this._data = data;
    return this;
  }

  update(data: unknown): this {
    this._operation = 'update';
    this._data = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  upsert(data: unknown, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}): this {
    this._operation = 'upsert';
    this._data = data;
    this._upsertOptions = options;
    return this;
  }

  eq(field: string, value: unknown): this {
    this._filters.push({ operator: 'eq', field, value });
    return this;
  }

  neq(field: string, value: unknown): this {
    this._filters.push({ operator: 'neq', field, value });
    return this;
  }

  like(field: string, value: unknown): this {
    this._filters.push({ operator: 'like', field, value });
    return this;
  }

  ilike(field: string, value: unknown): this {
    this._filters.push({ operator: 'ilike', field, value });
    return this;
  }

  in(field: string, values: unknown[]): this {
    this._filters.push({ operator: 'in', field, value: values });
    return this;
  }

  not(field: string, operator: string, value: unknown): this {
    this._filters.push({ operator: 'not', field, value: { operator, value } });
    return this;
  }

  gte(field: string, value: unknown): this {
    this._filters.push({ operator: 'gte', field, value });
    return this;
  }

  lte(field: string, value: unknown): this {
    this._filters.push({ operator: 'lte', field, value });
    return this;
  }

  gt(field: string, value: unknown): this {
    this._filters.push({ operator: 'gt', field, value });
    return this;
  }

  lt(field: string, value: unknown): this {
    this._filters.push({ operator: 'lt', field, value });
    return this;
  }

  is(field: string, value: unknown): this {
    this._filters.push({ operator: 'is', field, value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    this._order = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this._limitCount = count;
    return this;
  }

  single(): this {
    this._singleRow = true;
    return this;
  }

  maybeSingle(): this {
    this._maybeSingleRow = true;
    return this;
  }

  async execute(): Promise<{ data: unknown; error: unknown }> {
    const payload = {
      table: this._table,
      operation: this._operation,
      columns: this._columns,
      filters: this._filters,
      order: this._order,
      limit: this._limitCount,
      data: this._data,
      upsertOptions: this._upsertOptions,
    };

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok) {
        return { data: null, error: json.error || { message: 'Unknown error' } };
      }

      const rows: unknown[] = json.data;

      if (this._singleRow) {
        if (!rows || rows.length === 0) {
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        }
        if (rows.length > 1) {
          return { data: null, error: { code: 'PGRST117', message: 'Multiple rows found' } };
        }
        return { data: rows[0], error: null };
      }

      if (this._maybeSingleRow) {
        return { data: rows && rows.length > 0 ? rows[0] : null, error: null };
      }

      return { data: rows, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
    }
  }

  then(
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown
  ): Promise<unknown> {
    return this.execute().then(resolve, reject);
  }
}

class StorageBuilder {
  private _bucket: string;

  constructor(bucket: string) {
    this._bucket = bucket;
  }

  async upload(
    path: string,
    file: File | Blob | ArrayBuffer,
    options?: { contentType?: string; upsert?: boolean }
  ): Promise<{ data: unknown; error: unknown }> {
    const formData = new FormData();
    formData.append('file', file instanceof File ? file : new Blob([file], { type: options?.contentType }));
    formData.append('bucket', this._bucket);
    formData.append('path', path);
    if (options?.upsert !== undefined) formData.append('upsert', String(options.upsert));

    try {
      const response = await fetch(`${API_BASE}/storage/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) return { data: null, error: json.error || { message: 'Upload failed' } };
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
    }
  }

  async download(path: string): Promise<{ data: Blob | null; error: unknown }> {
    try {
      const response = await fetch(`${API_BASE}/storage/download?bucket=${encodeURIComponent(this._bucket)}&path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        const json = await response.json();
        return { data: null, error: json.error || { message: 'Download failed' } };
      }
      const blob = await response.blob();
      return { data: blob, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
    }
  }

  async remove(paths: string[]): Promise<{ data: unknown; error: unknown }> {
    try {
      const response = await fetch(`${API_BASE}/storage/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: this._bucket, paths }),
      });
      const json = await response.json();
      if (!response.ok) return { data: null, error: json.error || { message: 'Remove failed' } };
      return { data: json.data, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : 'Network error' } };
    }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    const url = `${API_BASE}/storage/public?bucket=${encodeURIComponent(this._bucket)}&path=${encodeURIComponent(path)}`;
    return { data: { publicUrl: url } };
  }
}

class SupabaseShim {
  from(table: string): QueryBuilder {
    return new QueryBuilder(table);
  }

  get storage() {
    return {
      from: (bucket: string) => new StorageBuilder(bucket),
    };
  }
}

export const supabase = new SupabaseShim();
