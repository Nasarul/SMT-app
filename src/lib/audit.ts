import { supabase } from './supabase';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'EXPORT' 
  | 'STATUS_CHANGE' 
  | 'PAYMENT' 
  | 'SYSTEM';

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

const LOCAL_STORAGE_KEY = 'smt_audit_logs_cache';
const MAX_LOCAL_LOGS = 100;

// Read cached local logs
export function getLocalAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save log locally as fallback/instant view
function saveLocalAuditLog(log: AuditLog) {
  try {
    const existing = getLocalAuditLogs();
    const updated = [log, ...existing.filter(item => item.id !== log.id)].slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not cache audit log locally:', err);
  }
}

/**
 * Logs an action to the audit_logs table and local cache
 */
export async function logAction(log: AuditLog): Promise<AuditLog> {
  const timestamp = log.created_at || new Date().toISOString();
  const logId = log.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  let currentUserId = log.user_id;
  let currentUserEmail = log.user_email;

  if (!currentUserEmail) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
        currentUserEmail = user.email || undefined;
      }
    } catch {
      // ignore auth check error in offline mode
    }
  }

  const completeLog: AuditLog = {
    ...log,
    id: logId,
    user_id: currentUserId,
    user_email: currentUserEmail || 'System / Operator',
    created_at: timestamp
  };

  // 1. Immediately cache locally so the UI sees it instantly
  saveLocalAuditLog(completeLog);

  // Dispatch custom window event so open pages can immediately update if needed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('smt_audit_log_added', { detail: completeLog }));
  }

  // 2. Persist to Supabase audit_logs table
  try {
    const { error } = await supabase.from('audit_logs').insert([{
      id: completeLog.id,
      action: completeLog.action,
      module: completeLog.module,
      record_id: completeLog.record_id,
      description: completeLog.description,
      old_data: completeLog.old_data,
      new_data: completeLog.new_data,
      user_id: completeLog.user_id,
      user_email: completeLog.user_email,
      ip_address: completeLog.ip_address,
      created_at: completeLog.created_at
    }]);

    if (error) {
      console.warn('Supabase audit_logs insert warning (cached locally):', error.message || error);
    }
  } catch (err) {
    console.warn('Network error logging audit action to remote:', err);
  }

  return completeLog;
}

/**
 * Fetch all audit logs (merges remote DB and local store)
 */
export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const localLogs = getLocalAuditLogs();
  
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn('Could not fetch from Supabase audit_logs table, using local cache:', error.message);
      return localLogs;
    }

    if (data && data.length > 0) {
      // Merge remote and local (deduplicate by id)
      const map = new Map<string, AuditLog>();
      
      // Add local first
      localLogs.forEach(l => {
        if (l.id) map.set(l.id, l);
      });
      // Remote overwrites or adds
      data.forEach((l: AuditLog) => {
        if (l.id) map.set(l.id, l);
      });

      const combined = Array.from(map.values()).sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      return combined;
    }

    return localLogs;
  } catch (err) {
    console.warn('Fetch audit logs failed, falling back to local:', err);
    return localLogs;
  }
}

/**
 * Helper shortcut loggers
 */
export const audit = {
  auth: (action: 'LOGIN' | 'LOGOUT', email: string, details?: any) =>
    logAction({
      action,
      module: 'Authentication',
      description: action === 'LOGIN' ? `User logged in: ${email}` : `User logged out: ${email}`,
      user_email: email,
      new_data: details,
    }),

  customer: (action: 'CREATE' | 'UPDATE' | 'DELETE', name: string, id?: string, data?: any) =>
    logAction({
      action,
      module: 'Customers',
      record_id: id,
      description: `${action === 'CREATE' ? 'Added new' : action === 'UPDATE' ? 'Updated' : 'Deleted'} customer: ${name}`,
      new_data: data,
    }),

  lead: (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE', name: string, status?: string, data?: any) =>
    logAction({
      action,
      module: 'Leads & CRM',
      description: action === 'STATUS_CHANGE' ? `Changed lead status of "${name}" to "${status}"` : `${action} lead: ${name}`,
      new_data: data,
    }),

  pilgrim: (type: 'Hajj' | 'Umrah', action: 'CREATE' | 'UPDATE' | 'DELETE', name: string, passport?: string, data?: any) =>
    logAction({
      action,
      module: `${type} Management`,
      description: `${action} pilgrim: ${name} (Passport: ${passport || 'N/A'})`,
      new_data: data,
    }),

  ticket: (action: 'CREATE' | 'UPDATE' | 'DELETE', title: string, data?: any) =>
    logAction({
      action,
      module: 'Flight & Tickets',
      description: `${action} flight ticket / booking: ${title}`,
      new_data: data,
    }),

  hotel: (action: 'CREATE' | 'UPDATE' | 'DELETE', hotelName: string, data?: any) =>
    logAction({
      action,
      module: 'Hotels & Accommodation',
      description: `${action} hotel booking / record for ${hotelName}`,
      new_data: data,
    }),

  accounts: (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAYMENT', title: string, amount?: number, data?: any) =>
    logAction({
      action,
      module: 'Finance & Accounts',
      description: `${action} transaction: ${title}${amount ? ` (BDT ${amount.toLocaleString()})` : ''}`,
      new_data: data,
    }),

  hrm: (action: 'CREATE' | 'UPDATE' | 'DELETE', title: string, data?: any) =>
    logAction({
      action,
      module: 'HR & Administration',
      description: `${action} HR record: ${title}`,
      new_data: data,
    }),

  visa: (action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE', applicant: string, status?: string, data?: any) =>
    logAction({
      action,
      module: 'Visa Processing',
      description: action === 'STATUS_CHANGE' ? `Visa status of "${applicant}" updated to "${status}"` : `${action} visa application for ${applicant}`,
      new_data: data,
    }),
    
  export: (module: string, count: number) =>
    logAction({
      action: 'EXPORT',
      module: module || 'System',
      description: `Exported ${count} records from ${module}`,
    }),
    
  system: (description: string, data?: any) =>
    logAction({
      action: 'SYSTEM',
      module: 'System Administration',
      description,
      new_data: data,
    })
};
