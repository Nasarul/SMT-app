import { supabase } from './supabase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT';

export interface AuditLog {
  id?: string;
  action: AuditAction;
  module: string;
  record_id?: string;
  description: string;
  old_data?: any;
  new_data?: any;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  created_at?: string;
}

/**
 * Logs an action to the audit_logs table
 */
export async function logAction(log: AuditLog) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('audit_logs').insert([{
      ...log,
      user_id: user?.id,
      user_email: user?.email,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.error('Audit Log Error:', error);
    }
  } catch (err) {
    console.error('Failed to log action:', err);
  }
}
