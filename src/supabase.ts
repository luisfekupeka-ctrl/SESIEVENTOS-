import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Auto-fix if user only provided the project ref (e.g. "abcde...") instead of the full URL
const supabaseUrl = rawUrl.includes('.') 
  ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
  : (rawUrl ? `https://${rawUrl}.supabase.co` : 'https://placeholder.supabase.co');

if (!rawUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Some features may not work.');
}

const realSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const authListeners = new Set<Function>();

const triggerAuthChange = () => {
  const sessionStr = localStorage.getItem('supabase.auth.token');
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const event = session ? 'SIGNED_IN' : 'SIGNED_OUT';
  authListeners.forEach(cb => cb(event, session));
};
(window as any)._triggerAuthChange = triggerAuthChange;

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (res.ok || res.status < 500) return res;
    if (url.startsWith('/api')) {
      const fallbackUrl = `http://localhost:3001${url}`;
      return await fetch(fallbackUrl, init);
    }
    return res;
  } catch {
    if (url.startsWith('/api')) {
      const fallbackUrl = `http://localhost:3001${url}`;
      return await fetch(fallbackUrl, init);
    }
    throw new Error('Servidor indisponível no momento. Tente novamente em instantes.');
  }
}

// SQLite Mock Client (used locally when VITE_USE_SQLITE is 'true')
class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: any[] = [];
  private orderFields: any[] = [];
  private limitValue?: number;
  private isSingle = false;
  private isMaybeSingle = false;
  private isHead = false;
  private countOption?: string;
  private payloadData: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', options?: { count?: string; head?: boolean }) {
    this.action = 'select';
    if (options?.head) {
      this.isHead = true;
    }
    if (options?.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.payloadData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.payloadData = data;
    return this;
  }

  upsert(data: any, options?: any) {
    this.action = 'upsert';
    this.payloadData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ column, op: 'in', value });
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderFields.push({ column, ascending });
    return this;
  }

  limit(val: number) {
    this.limitValue = val;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled: (res: { data: any; count?: number | null; error: any }) => void) {
    try {
      const response = await safeFetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: this.action,
          table: this.table,
          filters: this.filters,
          order: this.orderFields,
          limit: this.limitValue,
          single: this.isSingle || this.isMaybeSingle,
          data: this.payloadData
        })
      });
      
      const resData = await response.json();
      if (!response.ok) {
        onfulfilled({ data: null, count: null, error: { message: resData.error || `${this.action} failed` } });
      } else {
        if (this.action === 'select') {
          let dataResult = resData;
          if (this.isSingle || this.isMaybeSingle) {
            dataResult = Array.isArray(resData) ? (resData[0] || null) : resData;
          }
          const countValue = (this.countOption || this.isHead) ? (Array.isArray(resData) ? resData.length : (resData ? 1 : 0)) : null;
          onfulfilled({ 
            data: this.isHead ? null : dataResult, 
            count: countValue, 
            error: (this.isSingle && !dataResult) ? { message: 'Row not found' } : null 
          });
        } else {
          onfulfilled({ data: resData, error: null });
        }
      }
    } catch (error: any) {
      onfulfilled({ data: null, count: null, error: { message: error.message || 'Network error' } });
    }
  }
}

const sqliteMockClient: any = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(name: string, args: any) {
    try {
      const response = await safeFetch(`/api/rpc/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      const data = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: data.error || 'RPC failed' } };
      }
      if (name === 'register_participant') {
        return { data: { success: data.success, error: data.error }, error: null };
      }
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: { message: error.message || 'Network error' } };
    }
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          try {
            const response = await safeFetch(`/api/storage/upload?path=${encodeURIComponent(path)}`, {
              method: 'POST',
              headers: { 'Content-Type': file.type },
              body: file
            });
            const data = await response.json();
            if (!response.ok) {
              return { data: null, error: { message: data.error || 'Upload failed' } };
            }
            return { data, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message || 'Upload error' } };
          }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `/uploads/${path}` } };
        }
      };
    }
  },

  auth: {
    async getSession() {
      const sessionStr = localStorage.getItem('supabase.auth.token');
      return { data: { session: sessionStr ? JSON.parse(sessionStr) : null }, error: null };
    },
    
    onAuthStateChange(callback: any) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const response = await safeFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: data.error || 'Login falhou' } };
        }
        
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        triggerAuthChange();
        
        return { data: { user: data.session.user, session: data.session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message || 'Login error' } };
      }
    },

    async signUp({ email, password, options }: any) {
      try {
        const response = await safeFetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName: options?.data?.full_name || 'Admin User'
          })
        });
        const data = await response.json();
        
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: data.error || 'Erro no cadastro' } };
        }
        
        return { data: { user: data.user, session: null }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message || 'SignUp error' } };
      }
    },

    async signOut() {
      localStorage.removeItem('supabase.auth.token');
      triggerAuthChange();
      return { error: null };
    }
  },

  channel(name: string) {
    return {
      on(event: string, filter: any, callback: any) {
        return this;
      },
      subscribe(callback: any) {
        if (callback) callback('SUBSCRIBED');
        return this;
      }
    };
  },

  removeChannel(channel: any) {}
};

// Check if we are running in SQLite mode
const useSQLite = import.meta.env.VITE_USE_SQLITE === 'true';

if (useSQLite) {
  console.log('[Supabase] Running locally in SQLite mock mode');
} else {
  console.log('[Supabase] Running in standard cloud mode');
}

export const supabase = useSQLite ? sqliteMockClient : realSupabaseClient;
