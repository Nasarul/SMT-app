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
      // Query profiles collection where 'id' matches the user's ID
      // You must create a 'profiles' collection in Appwrite with an 'id' attribute
      const response = await databases.listDocuments(databaseId, 'profiles', [
        Query.equal('id', userId)
      ]);
      if (response.documents.length > 0) {
        setProfile(response.documents[0] as unknown as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const currentSession = await account.getSession('current');
        setSession(currentSession);
        const currentUser = await account.get();
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.$id);
        }
      } catch (error) {
        // Not logged in or session expired
        console.log('No active session found.');
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
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
