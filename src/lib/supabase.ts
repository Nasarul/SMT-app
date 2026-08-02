import { account, databases, databaseId, storage as appwriteStorage, client } from './appwrite';
import { ID, Query } from 'appwrite';

// This acts as a polyfill/adapter.
// It translates your existing Supabase code into Appwrite SDK calls automatically!
// This saves you from having to rewrite all 40+ pages right now.

export const supabase = {
  auth: {
    getSession: async () => {
      try {
        const session = await account.getSession('current');
        const user = await account.get();
        return { data: { session: { user: { id: user.$id, ...user } } }, error: null };
      } catch (e) {
        return { data: { session: null }, error: null };
      }
    },
    onAuthStateChange: (callback: any) => {
      // Dummy subscription since Appwrite relies on active session checks
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        await account.createEmailPasswordSession(email, password);
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },
    signOut: async () => {
      try {
        await account.deleteSession('current');
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    }
  },
  channel: (name: string) => {
    return {
      on: (event: string, filterOptions: any, callback: (payload: any) => void) => {
        const table = filterOptions.table;
        let filterField: string | null = null;
        let filterValue: any = null;
        if (filterOptions.filter) {
          const parts = filterOptions.filter.split('=eq.');
          if (parts.length === 2) {
            filterField = parts[0];
            filterValue = parts[1];
          }
        }
        
        let unsubscribeFunc = () => {};
        const builder = {
          subscribe: () => {
            const appwriteChannel = `databases.${databaseId}.collections.${table}.documents`;
            const sub = client.subscribe(appwriteChannel, (response: any) => {
              const isCreate = response.events.some((e: string) => e.endsWith('.create'));
              if (isCreate) {
                const doc = response.payload;
                let matches = true;
                if (filterField) {
                  const docValue = doc[filterField === 'id' ? '$id' : filterField];
                  if (String(docValue) !== String(filterValue)) {
                    matches = false;
                  }
                }
                if (matches) {
                  const mappedDoc = { ...doc, id: doc.$id };
                  callback({ new: mappedDoc });
                }
              }
            });
            unsubscribeFunc = sub;
            return {
              unsubscribe: () => {
                if (unsubscribeFunc) unsubscribeFunc();
              }
            };
          }
        };
        return builder;
      }
    };
  },
  from: (table: string) => {
    return {
      select: (fields = '*', options: any = {}) => {
        let currentQueries: string[] = [];
        const builder = {
          eq: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.equal(mappedField, value));
            return builder;
          },
          neq: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.notEqual(mappedField, value));
            return builder;
          },
          lt: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.lessThan(mappedField, value));
            return builder;
          },
          lte: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.lessThanEqual(mappedField, value));
            return builder;
          },
          gt: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.greaterThan(mappedField, value));
            return builder;
          },
          gte: (field: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.greaterThanEqual(mappedField, value));
            return builder;
          },
          in: (field: string, values: any[]) => {
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.equal(mappedField, values));
            return builder;
          },
          not: (field: string, operator: string, value: any) => {
            const mappedField = field === 'id' ? '$id' : field;
            if (operator === 'eq') {
              currentQueries.push(Query.notEqual(mappedField, value));
            } else if (operator === 'is') {
              if (value === null) {
                currentQueries.push(Query.isNotNull(mappedField));
              } else {
                currentQueries.push(Query.notEqual(mappedField, value));
              }
            } else {
              currentQueries.push(Query.notEqual(mappedField, value));
            }
            return builder;
          },
          or: (queryStr: string) => {
            const parts = queryStr.split(',');
            const subQueries = parts.map(part => {
              const firstDot = part.indexOf('.');
              const secondDot = part.indexOf('.', firstDot + 1);
              if (firstDot === -1 || secondDot === -1) return null;
              const field = part.substring(0, firstDot);
              const op = part.substring(firstDot + 1, secondDot);
              const val = part.substring(secondDot + 1);
              const mappedField = field === 'id' ? '$id' : field;
              
              if (op === 'eq') return Query.equal(mappedField, val);
              if (op === 'neq') return Query.notEqual(mappedField, val);
              if (op === 'lt') return Query.lessThan(mappedField, val);
              if (op === 'lte') return Query.lessThanEqual(mappedField, val);
              if (op === 'gt') return Query.greaterThan(mappedField, val);
              if (op === 'gte') return Query.greaterThanEqual(mappedField, val);
              return null;
            }).filter(Boolean) as string[];
            
            if (subQueries.length > 0) {
              currentQueries.push(Query.or(subQueries));
            }
            return builder;
          },
          order: (field: string, options: { ascending?: boolean } = {}) => {
            const mappedField = field === 'id' ? '$id' : field;
            if (options.ascending === false) {
              currentQueries.push(Query.orderDesc(mappedField));
            } else {
              currentQueries.push(Query.orderAsc(mappedField));
            }
            return builder;
          },
          limit: (val: number) => {
            currentQueries.push(Query.limit(val));
            return builder;
          },
          maybeSingle: async () => {
            try {
              const res = await databases.listDocuments(databaseId, table, currentQueries);
              return { data: res.documents[0] ? { ...res.documents[0], id: res.documents[0].$id } : null, error: null };
            } catch (e: any) {
              console.error(`Appwrite error in maybeSingle on table "${table}":`, e);
              return { data: null, error: e };
            }
          },
          then: (resolve: any, reject: any) => {
            databases.listDocuments(databaseId, table, currentQueries)
              .then(res => {
                const mappedDocs = res.documents.map(doc => ({ ...doc, id: doc.$id }));
                resolve({ data: mappedDocs, error: null });
              })
              .catch(err => {
                console.error(`Appwrite error in select/then on table "${table}" with queries:`, currentQueries, err);
                resolve({ data: null, error: err });
              });
          }
        };
        return builder;
      },
      insert: (data: any[]) => {
        const payload = data[0];
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) payload[key] = null;
        });

        const builder = {
          then: (resolve: any) => {
             databases.createDocument(databaseId, table, ID.unique(), payload)
               .then(res => resolve({ data: [res], error: null }))
               .catch(err => resolve({ data: null, error: err }));
          }
        };
        return builder;
      },
      update: (data: any) => {
        let targetId: string | null = null;
        const builder = {
          eq: (field: string, value: any) => {
            if (field === 'id' || field === '$id') targetId = value;
            return builder;
          },
          then: (resolve: any) => {
             if (!targetId) return resolve({ error: new Error('Missing ID for update') });
             databases.updateDocument(databaseId, table, targetId, data)
               .then(res => resolve({ data: [res], error: null }))
               .catch(err => resolve({ data: null, error: err }));
          }
        };
        return builder;
      },
      delete: () => {
        let targetId: string | null = null;
        const builder = {
          eq: (field: string, value: any) => {
            if (field === 'id' || field === '$id') targetId = value;
            return builder;
          },
          then: (resolve: any) => {
              if (!targetId) return resolve({ error: new Error('Missing ID for delete') });
              databases.deleteDocument(databaseId, table, targetId)
                .then(() => resolve({ data: [], error: null }))
                .catch(err => resolve({ data: null, error: err }));
          }
        };
        return builder;
      }
    };
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const res = await appwriteStorage.createFile(bucket, ID.unique(), file);
          return { data: { path: res.$id }, error: null };
        } catch (e: any) {
          return { data: null, error: e };
        }
      },
      getPublicUrl: (pathOrId: string) => {
        try {
          const url = appwriteStorage.getFileView(bucket, pathOrId);
          return { data: { publicUrl: url.toString() } };
        } catch (e) {
          return { data: { publicUrl: '' } };
        }
      }
    })
  }
};

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'hr_manager'
  | 'accounts_manager'
  | 'sales_agent'
  | 'tour_manager'
  | 'b2b_agent'
  | 'customer';

export interface Profile {
  id: string; // Mapped from $id
  $id?: string;
  full_name: string;
  username?: string;
  role: UserRole;
  phone: string;
  address?: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
}
