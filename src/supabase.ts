// Mock Supabase Client that redirects all DB operations to the local SQLite/Express backend
// This allows running the entire application completely offline / locally with SQLite

class QueryBuilder {
  private table: string;
  private filters: any[] = [];
  private orderFields: any[] = [];
  private limitValue?: number;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*') {
    // We fetch all fields from our SQLite server and format joins on backend
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: 'eq', value });
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

  // Allow the query builder to be awaited directly (thenable pattern)
  async then(onfulfilled: (res: { data: any; error: any }) => void) {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: this.table,
          filters: this.filters,
          order: this.orderFields,
          limit: this.limitValue,
          single: this.isSingle
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        onfulfilled({ data: null, error: { message: data.error || 'Fetch failed' } });
      } else {
        onfulfilled({ data, error: null });
      }
    } catch (error: any) {
      onfulfilled({ data: null, error });
    }
  }

  async insert(data: any) {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          table: this.table,
          data
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: resData.error || 'Insert failed' } };
      }
      return { data: resData, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async update(data: any) {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          table: this.table,
          data,
          filters: this.filters
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: resData.error || 'Update failed' } };
      }
      return { data: resData, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async delete() {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          table: this.table,
          filters: this.filters
        })
      });
      const resData = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: resData.error || 'Delete failed' } };
      }
      return { data: resData, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }
}

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },

  async rpc(name: string, args: any) {
    try {
      const response = await fetch(`/api/rpc/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      const data = await response.json();
      if (!response.ok) {
        return { data: null, error: { message: data.error || 'RPC failed' } };
      }
      // Return RPC format matching expected output
      if (name === 'register_participant') {
        return { data: { success: data.success, error: data.error }, error: null };
      }
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File) {
          try {
            const response = await fetch(`/api/storage/upload?path=${encodeURIComponent(path)}`, {
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
            return { data: null, error };
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
      // Mock triggers auth events
      const triggerAuthChange = () => {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        callback(sessionStr ? 'SIGNED_IN' : 'SIGNED_OUT', sessionStr ? JSON.parse(sessionStr) : null);
      };
      
      // Store trigger globally to trigger on login/logout
      (window as any)._triggerAuthChange = triggerAuthChange;
      
      // Return unsubscribe no-op
      return { data: { subscription: { unsubscribe() {} } } };
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: data.error || 'Login falhou' } };
        }
        
        localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
        if ((window as any)._triggerAuthChange) {
          (window as any)._triggerAuthChange();
        }
        
        return { data: { user: data.session.user, session: data.session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error };
      }
    },

    async signUp({ email, password, options }: any) {
      try {
        const response = await fetch('/api/auth/signup', {
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
        return { data: { user: null, session: null }, error };
      }
    },

    async signOut() {
      localStorage.removeItem('supabase.auth.token');
      if ((window as any)._triggerAuthChange) {
        (window as any)._triggerAuthChange();
      }
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
