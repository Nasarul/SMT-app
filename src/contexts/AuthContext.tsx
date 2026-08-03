import React, { createContext, useContext, useEffect, useState } from 'react';
import { Models, Query } from 'appwrite';
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
      // Fetch the profile document directly using the user's ID
      const profileDoc = await databases.getDocument(databaseId, 'profiles', userId);
      setProfile(profileDoc as unknown as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Safety fallback timer: Ensure loading spinner turns off after 2.5 seconds max
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    const initializeAuth = async () => {
      try {
        // Race session checks against a 2-second timeout to prevent hanging on slow/blocked connections
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 2000)
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
        // Not logged in or session expired or timeout
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
      const session = await account.createEmailPasswordSession(email, password);
      setSession(session);
      const currentUser = await account.get();
      setUser(currentUser);
      await fetchProfile(currentUser.$id);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession('current');
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.$id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
