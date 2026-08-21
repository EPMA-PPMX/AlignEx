interface Filter {
  field: string;
  operator: string;
  value: unknown;
}

interface OrderConfig {
  column: string;
  ascending: boolean;
}

interface UpsertOptions {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated';
}

interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

const getApiBase = (): string =>
  (import.meta.env.VITE_API_URL as string | undefined) ?? '';

class QueryBuilder<T = unknown> {
  private _table: string;
  private _operation = 'select';
  private _columns = '*';
  private _filters: Filter[] = [];
  private _order: OrderConfig | null = null;
  private _limit: number | null = null;
  private _data: unknown = null;
  private _upsertOptions: UpsertOptions | null = null;
  private _single = false;
  private _maybeSingle = false;
  private _includeCount = false;

  constructor(table: string) {
    this._table = table;
  }

  select(columns = '*', options?: SelectOptions) {
    if (this._operation === 'select') {
      this._columns = columns;
    }
    if (options?.count) {
      this._includeCount = true;
    }
    return this as QueryBuilder<T>;
  }

  insert(data: unknown) {
    this._operation = 'insert';
    this._data = data;
    return this as QueryBuilder<T>;
  }

  update(data: unknown) {
    this._operation = 'update';
    this._data = data;
    return this as QueryBuilder<T>;
  }

  delete() {
    this._operation = 'delete';
    return this as QueryBuilder<T>;
  }

  upsert(data: unknown, options?: UpsertOptions) {
    this._operation = 'upsert';
    this._data = data;
    this._upsertOptions = options ?? null;
    return this as QueryBuilder<T>;
  }

  eq(field: string, value: unknown) {
    this._filters.push({ field, operator: 'eq', value });
    return this;
  }

  neq(field: string, value: unknown) {
    this._filters.push({ field, operator: 'neq', value });
    return this;
  }

  in(field: string, values: unknown[]) {
    this._filters.push({ field, operator: 'in', value: values });
    return this;
  }

  not(field: string, operator: string, value: unknown) {
    this._filters.push({ field, operator: 'not', value: { operator, value } });
    return this;
  }

  is(field: string, value: unknown) {
    this._filters.push({ field, operator: 'is', value });
    return this;
  }

  ilike(field: string, pattern: string) {
    this._filters.push({ field, operator: 'ilike', value: pattern });
    return this;
  }

  like(field: string, pattern: string) {
    this._filters.push({ field, operator: 'like', value: pattern });
    return this;
  }

  gte(field: string, value: unknown) {
    this._filters.push({ field, operator: 'gte', value });
    return this;
  }

  lte(field: string, value: unknown) {
    this._filters.push({ field, operator: 'lte', value });
    return this;
  }

  gt(field: string, value: unknown) {
    this._filters.push({ field, operator: 'gt', value });
    return this;
  }

  lt(field: string, value: unknown) {
    this._filters.push({ field, operator: 'lt', value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._order = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  then(
    onFulfilled: ((value: QueryResult<T>) => unknown) | null | undefined,
    onRejected?: ((reason: unknown) => unknown) | null,
  ) {
    return this._execute().then(onFulfilled as any, onRejected as any);
  }

  private async _execute(): Promise<QueryResult<T>> {
    try {
      const body: Record<string, unknown> = {
        table: this._table,
        operation: this._operation,
        columns: this._columns,
      };
      if (this._filters.length > 0) body.filters = this._filters;
      if (this._order) body.order = this._order;
      if (this._limit != null) body.limit = this._limit;
      if (this._data != null) body.data = this._data;
      if (this._upsertOptions) body.upsertOptions = this._upsertOptions;

      const response = await fetch(`${getApiBase()}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error ?? { message: 'Request failed' }, count: null };
      }

      const rows: T[] = result.data ?? [];

      if (this._single) {
        const row = rows[0] ?? null;
        if (!row) {
          return {
            data: null,
            error: { message: 'No rows returned', code: 'PGRST116' },
            count: null,
          };
        }
        return { data: row as T, error: null, count: this._includeCount ? 1 : undefined };
      }

      if (this._maybeSingle) {
        return {
          data: (rows[0] ?? null) as T,
          error: null,
          count: this._includeCount ? rows.length : undefined,
        };
      }

      return {
        data: rows as unknown as T,
        error: null,
        count: this._includeCount ? rows.length : undefined,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { data: null, error: { message }, count: null };
    }
  }
}

export function from<T = unknown>(table: string): QueryBuilder<T> {
  return new QueryBuilder<T>(table);
}
