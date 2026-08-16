import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Initialize the official Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

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
  id: string; // Native Supabase ID
  full_name: string;
  username?: string;
  role: UserRole;
  phone: string;
  address?: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
}
