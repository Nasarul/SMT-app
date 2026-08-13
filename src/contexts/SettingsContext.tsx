import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
}

interface SettingsContextType {
  company: CompanySettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const defaultCompany: CompanySettings = {
  name: 'Sonar Madina Travels',
  tagline: 'Your Trusted Hajj & Umrah Partner',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1XXX XXXXXX',
  email: 'info@sonarmadina.com',
  logo_url: '/logo.png'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<CompanySettings>(defaultCompany);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 1200);

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Settings fetch timeout')), 1200)
      );

      const response = await Promise.race([
        supabase.from('settings').select('*'),
        timeout
      ]) as any;

      if (response && response.data && Array.isArray(response.data)) {
        response.data.forEach((s: any) => {
          if (s.key === 'company' && s.value) {
            setCompany(s.value);
            document.title = `${s.value.name || 'Sonar Madina Travels'} | Management Portal`;
            if (s.value.logo_url) {
              const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
              link.type = 'image/x-icon';
              link.rel = 'shortcut icon';
              link.href = s.value.logo_url;
              document.getElementsByTagName('head')[0].appendChild(link);
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading global settings:', err);
    } finally {
      clearTimeout(fallbackTimer);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ company, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
