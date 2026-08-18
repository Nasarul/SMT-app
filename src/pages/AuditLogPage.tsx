import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, History, Shield, User, Clock, ArrowRight, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  description: string;
  user_email: string;
  created_at: string;
  old_data?: any;
  new_data?: any;
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'error';
      case 'LOGIN': return 'primary';
      default: return 'neutral';
    }
  };

  const filtered = logs.filter(log => 
    (log.description.toLowerCase().includes(search.toLowerCase()) || 
     log.user_email?.toLowerCase().includes(search.toLowerCase())) &&
    (moduleFilter === '' || log.module === moduleFilter)
  );

  const modules = Array.from(new Set(logs.map(l => l.module)));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <button className="btn-outline flex items-center gap-2 border-primary-200 text-primary-700 shadow-sm hover:shadow-md transition-all">
          <Download size={16} /> Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by description or user email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="input-field sm:w-48"
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
        >
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={loadLogs} className="btn-ghost flex items-center gap-2">
          <History size={15} /> Refresh
        </button>
      </div>

      {/* Timeline view */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="table-header text-left">Time & Date</th>
                <th className="table-header text-left">User</th>
                <th className="table-header text-center">Action</th>
                <th className="table-header text-left">Module</th>
                <th className="table-header text-left">Description</th>
                <th className="table-header text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">Loading audit history...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={Shield} title="No logs found" description="Activities will appear here once users perform actions" /></td></tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                        <Clock size={12} className="text-neutral-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-[10px] font-bold uppercase">
                          {log.user_email?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs font-semibold text-neutral-700">{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={getActionBadge(log.action) as any} className="text-[10px] uppercase font-black">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-100 px-2 py-0.5 rounded-md">
                        {log.module}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm text-neutral-800 font-medium">{log.description}</p>
                    </td>
                    <td className="table-cell text-right">
                      <button className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1 justify-end">
                        View JSON <ArrowRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 bg-secondary-50 rounded-xl border border-secondary-100">
        <Shield size={18} className="text-secondary-600 mt-0.5" />
        <div className="text-xs text-secondary-800 leading-relaxed">
          <strong>Security Compliance:</strong> This audit trail is immutable and cannot be deleted by standard users. It serves as a permanent record of all changes for accountability and troubleshooting. In case of data discrepancies, use this log to identify the origin of change.
        </div>
      </div>
    </div>
  );
}
