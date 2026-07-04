import { account, databases, databaseId, storage as appwriteStorage } from './appwrite';
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
  from: (table: string) => {
    return {
      select: (fields = '*') => {
        let currentQueries: string[] = [];
        const builder = {
          eq: (field: string, value: any) => {
            // Map Supabase 'id' queries to Appwrite system '$id'
            const mappedField = field === 'id' ? '$id' : field;
            currentQueries.push(Query.equal(mappedField, value));
            return builder;
          },
          order: (field: string, options: { ascending?: boolean } = {}) => {
            if (options.ascending === false) {
              currentQueries.push(Query.orderDesc(field));
            } else {
              currentQueries.push(Query.orderAsc(field));
            }
            return builder;
          },
          maybeSingle: async () => {
            try {
              const res = await databases.listDocuments(databaseId, table, currentQueries);
              return { data: res.documents[0] || null, error: null };
            } catch (e: any) {
              return { data: null, error: e };
            }
          },
          then: (resolve: any, reject: any) => {
            databases.listDocuments(databaseId, table, currentQueries)
              .then(res => {
                // Map Appwrite's $id to Supabase's id for compatibility
                const mappedDocs = res.documents.map(doc => ({ ...doc, id: doc.$id }));
                resolve({ data: mappedDocs, error: null });
              })
              .catch(err => resolve({ data: null, error: err }));
          }
        };
        return builder;
      },
      insert: (data: any[]) => {
        const payload = data[0];
        // Clean up undefined/null values that Appwrite might reject
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
} as any;

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
