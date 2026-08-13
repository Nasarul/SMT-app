import React, { createContext, useContext, useEffect, useState } from 'react';
import { Models, ID } from 'appwrite';
import { account, databases, databaseId, Profile } from '../lib/appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  profile: Profile | null;
  session: Models.Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Models.Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      if (!databaseId) {
        console.warn('Appwrite databaseId not configured.');
        return;
      }
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 1200)
      );
      const profileDoc = await Promise.race([
        databases.getDocument(databaseId, 'profiles', userId),
        timeout,
      ]);
      setProfile(profileDoc as unknown as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Strict 1.2-second fallback timer: Ensures loading spinner turns off under all network conditions
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    const initializeAuth = async () => {
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 1200)
        );

        const currentSession = (await Promise.race([
          account.getSession('current'),
          timeout,
        ])) as Models.Session;

        if (!isMounted) return;
        setSession(currentSession);

        const currentUser = (await Promise.race([
          account.get(),
          timeout,
        ])) as Models.User<Models.Preferences>;

        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.$id);
        }
      } catch (error) {
        console.log('No active session found or request timed out.');
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timer);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // 1. Purge active session to prevent 409 conflict
      try {
        await account.deleteSession('current');
      } catch (e) {
        // Ignore if no active session
      }

      let activeSession: Models.Session;
      try {
        activeSession = await account.createEmailPasswordSession(email, password);
      } catch (sessionErr: any) {
        const errMsg = sessionErr?.message || '';
        const code = sessionErr?.code;

        // If user does not exist yet in Appwrite backend, auto-provision user account
        if (code === 404 || errMsg.toLowerCase().includes('user_not_found') || errMsg.toLowerCase().includes('could not be found')) {
          try {
            const displayName = email.split('@')[0].replace(/[._-]/g, ' ');
            await account.create(ID.unique(), email, password, displayName);
            activeSession = await account.createEmailPasswordSession(email, password);
          } catch (createErr: any) {
            return { error: createErr?.message || 'Failed to auto-create user account in Appwrite.' };
          }
        } else {
          return { error: errMsg || 'Invalid login credentials. Please check your email and password.' };
        }
      }

      setSession(activeSession);
      const currentUser = await account.get();
      setUser(currentUser);
      await fetchProfile(currentUser.$id);
      return { error: null };
    } catch (error: any) {
      console.error('Appwrite Sign In Error:', error);
      return { error: error?.message || 'Login failed. Please check your credentials.' };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession('current');
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.$id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
