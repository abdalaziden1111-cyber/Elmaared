// Lightweight in-memory Supabase mock for Server Action integration tests.
// Implements just the chainable surface the actions actually use:
//   .from(table).select(cols).eq(col, val).single() / .maybeSingle()
//   .from(table).insert(...).select(cols).single()
//   .from(table).update(...).eq(col, val)
//   .from(table).delete().eq(col, val)
//   .auth.getUser() / .auth.signUp() / .auth.signInWithPassword() / .auth.signOut()
//   .auth.admin.deleteUser() / .auth.admin.getUserById()
//   .auth.resetPasswordForEmail() / .auth.updateUser()
//
// The mock is intentionally permissive — actions that look up rows the
// test didn't pre-seed get `null` back, mimicking RLS denial. Tests can
// inject specific errors via `setError(table, op, err)` to exercise
// error paths without a real DB.

export type SupabaseTable = string;

export interface MockedRow {
  [k: string]: unknown;
}

export interface MockedError {
  code?: string;
  message: string;
}

interface StorageUpload {
  bucket: string;
  path: string;
  size: number;
  contentType?: string;
}

interface Store {
  rows: Map<SupabaseTable, MockedRow[]>;
  errors: Map<string, MockedError>; // key = `${table}:${op}`
  authUser: { id: string; email?: string } | null;
  authSignUpResult:
    | { user: { id: string; email: string } | null; error: MockedError | null }
    | null;
  authSignInError: MockedError | null;
  insertedRows: Map<SupabaseTable, MockedRow[]>;
  updates: Array<{ table: string; values: MockedRow; eqs: Array<[string, unknown]> }>;
  deletes: Array<{ table: string; eqs: Array<[string, unknown]> }>;
  audits: MockedRow[];
  storageUploads: StorageUpload[];
  storageRemovals: Array<{ bucket: string; paths: string[] }>;
  storageErrors: Map<string, MockedError>; // key = `${bucket}:${op}`
  signedUrls: Map<string, string>; // key = `${bucket}:${path}`
}

export interface SupabaseMock {
  client: ReturnType<typeof buildClient>;
  store: Store;
  setUser: (user: { id: string; email?: string } | null) => void;
  setRows: (table: SupabaseTable, rows: MockedRow[]) => void;
  setError: (table: SupabaseTable, op: 'select' | 'insert' | 'update' | 'delete', err: MockedError | null) => void;
  setSignUpResult: (result: Store['authSignUpResult']) => void;
  setSignInError: (err: MockedError | null) => void;
  getInserts: (table: SupabaseTable) => MockedRow[];
  getUpdates: (table: SupabaseTable) => Store['updates'];
  getDeletes: (table: SupabaseTable) => Store['deletes'];
  setStorageError: (bucket: string, op: 'upload' | 'createSignedUrl' | 'remove', err: MockedError | null) => void;
  setSignedUrl: (bucket: string, path: string, url: string) => void;
  getStorageUploads: () => StorageUpload[];
  getStorageRemovals: () => Array<{ bucket: string; paths: string[] }>;
}

export function createSupabaseMock(): SupabaseMock {
  const store: Store = {
    rows: new Map(),
    errors: new Map(),
    authUser: null,
    authSignUpResult: null,
    authSignInError: null,
    insertedRows: new Map(),
    updates: [],
    deletes: [],
    audits: [],
    storageUploads: [],
    storageRemovals: [],
    storageErrors: new Map(),
    signedUrls: new Map(),
  };

  return {
    client: buildClient(store),
    store,
    setUser: (user) => {
      store.authUser = user;
    },
    setRows: (table, rows) => {
      store.rows.set(table, rows);
    },
    setError: (table, op, err) => {
      const key = `${table}:${op}`;
      if (err) store.errors.set(key, err);
      else store.errors.delete(key);
    },
    setSignUpResult: (result) => {
      store.authSignUpResult = result;
    },
    setSignInError: (err) => {
      store.authSignInError = err;
    },
    getInserts: (table) => store.insertedRows.get(table) ?? [],
    getUpdates: (table) => store.updates.filter((u) => u.table === table),
    getDeletes: (table) => store.deletes.filter((d) => d.table === table),
    setStorageError: (bucket, op, err) => {
      const key = `${bucket}:${op}`;
      if (err) store.storageErrors.set(key, err);
      else store.storageErrors.delete(key);
    },
    setSignedUrl: (bucket, path, url) => {
      store.signedUrls.set(`${bucket}:${path}`, url);
    },
    getStorageUploads: () => store.storageUploads,
    getStorageRemovals: () => store.storageRemovals,
  };
}

function buildClient(store: Store) {
  function from(table: string) {
    return new QueryBuilder(store, table);
  }

  return {
    from,
    auth: {
      async getUser() {
        return { data: { user: store.authUser }, error: null };
      },
      async signUp(args: { email: string; password: string; options?: unknown }) {
        const r = store.authSignUpResult;
        if (r) {
          return { data: { user: r.user }, error: r.error };
        }
        // Default: succeed with a generated id
        const user = { id: `usr_${Math.random().toString(36).slice(2)}`, email: args.email };
        store.authUser = user;
        return { data: { user }, error: null };
      },
      async signInWithPassword(_args: { email: string; password: string }) {
        if (store.authSignInError) {
          return { data: { user: null, session: null }, error: store.authSignInError };
        }
        return { data: { user: store.authUser, session: {} }, error: null };
      },
      async signOut() {
        store.authUser = null;
        return { error: null };
      },
      async resetPasswordForEmail(_email: string, _opts?: unknown) {
        return { data: {}, error: null };
      },
      async updateUser(_args: { password?: string }) {
        return { data: { user: store.authUser }, error: null };
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { session: {} }, error: null };
      },
      admin: {
        async deleteUser(_id: string) {
          store.authUser = null;
          return { data: {}, error: null };
        },
        async getUserById(id: string) {
          return {
            data: { user: store.authUser?.id === id ? store.authUser : null },
            error: null,
          };
        },
      },
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(
            path: string,
            file: { size: number; type?: string },
            _opts?: unknown
          ) {
            const err = store.storageErrors.get(`${bucket}:upload`);
            if (err) return { data: null, error: err };
            store.storageUploads.push({
              bucket,
              path,
              size: file.size,
              contentType: file.type,
            });
            return { data: { path }, error: null };
          },
          async createSignedUrl(path: string, _ttlSeconds: number) {
            const err = store.storageErrors.get(`${bucket}:createSignedUrl`);
            if (err) return { data: null, error: err };
            const signed = store.signedUrls.get(`${bucket}:${path}`);
            return {
              data: { signedUrl: signed ?? `https://mock.signed/${bucket}/${path}` },
              error: null,
            };
          },
          async remove(paths: string[]) {
            const err = store.storageErrors.get(`${bucket}:remove`);
            if (err) return { data: null, error: err };
            store.storageRemovals.push({ bucket, paths });
            return { data: paths.map((p) => ({ name: p })), error: null };
          },
        };
      },
    },
  };
}

class QueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private inserted: MockedRow[] | null = null;
  private updateValues: MockedRow | null = null;
  private isDelete = false;
  private nullChecks: string[] = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(
    private store: Store,
    private table: string
  ) {}

  select(_cols?: string) {
    if (this.op !== 'insert' && this.op !== 'update') this.op = 'select';
    return this;
  }

  insert(values: MockedRow | MockedRow[]) {
    this.op = 'insert';
    this.inserted = Array.isArray(values) ? values : [values];
    const existing = this.store.insertedRows.get(this.table) ?? [];
    this.store.insertedRows.set(this.table, [...existing, ...this.inserted]);
    return this;
  }

  // Mock treats upsert as an insert for routing purposes — the conflict
  // resolution (`onConflict`) is a DB concern we don't simulate. The mock
  // honors `setError(table, 'insert', ...)` for both insert and upsert so
  // tests can exercise either path with the same hook.
  upsert(values: MockedRow | MockedRow[], _opts?: unknown) {
    return this.insert(values);
  }

  update(values: MockedRow) {
    this.op = 'update';
    this.updateValues = values;
    this.store.updates.push({ table: this.table, values, eqs: [] });
    return this;
  }

  delete() {
    this.op = 'delete';
    this.isDelete = true;
    this.store.deletes.push({ table: this.table, eqs: [] });
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push([col, val]);
    if (this.op === 'update') {
      const last = this.store.updates[this.store.updates.length - 1];
      if (last) last.eqs.push([col, val]);
    } else if (this.op === 'delete') {
      const last = this.store.deletes[this.store.deletes.length - 1];
      if (last) last.eqs.push([col, val]);
    }
    return this;
  }

  neq(_col: string, _val: unknown) {
    return this;
  }

  in(_col: string, _values: unknown[]) {
    return this;
  }

  is(col: string, val: unknown) {
    if (val === null) this.nullChecks.push(col);
    return this;
  }

  contains(_col: string, _val: unknown) {
    return this;
  }

  order(_col: string, _opts?: unknown) {
    return this;
  }

  limit(_n: number) {
    return this;
  }

  lte(_col: string, _val: unknown) {
    return this;
  }

  gte(_col: string, _val: unknown) {
    return this;
  }

  async single() {
    return this.executeSingle();
  }

  async maybeSingle() {
    return this.executeSingle();
  }

  // The await behavior — for `await admin.from(...).insert(...)` without .single()
  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeWithoutSingle().then(onfulfilled, onrejected);
  }

  private async executeWithoutSingle() {
    const err = this.store.errors.get(`${this.table}:${this.op}`);
    if (err) return { data: null, error: err };
    return { data: null, error: null };
  }

  private async executeSingle() {
    const err = this.store.errors.get(`${this.table}:${this.op}`);
    if (err) return { data: null, error: err };

    if (this.op === 'insert' && this.inserted) {
      // Pretend the DB assigned an id if one wasn't provided
      const row = { id: 'gen_id_' + Math.random().toString(36).slice(2), ...this.inserted[0] };
      return { data: row, error: null };
    }

    if (this.op === 'update' && this.updateValues) {
      // Return the updated values merged with eqs as a stand-in row
      const row = {
        ...Object.fromEntries(this.filters),
        ...this.updateValues,
      };
      return { data: row, error: null };
    }

    if (this.op === 'delete' || this.isDelete) {
      return { data: null, error: null };
    }

    // SELECT: find first row matching all filters
    const rows = this.store.rows.get(this.table) ?? [];
    const match = rows.find((row) =>
      this.filters.every(([col, val]) => row[col] === val)
    );
    return { data: match ?? null, error: null };
  }
}
