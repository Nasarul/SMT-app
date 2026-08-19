import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  History, 
  Shield, 
  Clock, 
  Download, 
  Filter, 
  CheckCircle2, 
  Eye, 
  Copy, 
  Check, 
  Radio, 
  FileSpreadsheet, 
  FileCode, 
  PlusCircle, 
  User, 
  Laptop, 
  Layers
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { fetchAuditLogs, logAction, audit, AuditLog } from '../lib/audit';
import { useAuth } from '../contexts/AuthContext';

export function AuditLogPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();

    // 1. Listen for local window audit events
    const handleLocalAudit = (e: any) => {
      if (e.detail) {
        setLogs(prev => [e.detail, ...prev.filter(item => item.id !== e.detail.id)]);
      }
    };
    window.addEventListener('smt_audit_log_added', handleLocalAudit);

    // 2. Listen for Supabase Realtime changes
    const channel = supabase
      .channel('realtime_audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
        if (payload.new) {
          setLogs(prev => [payload.new as AuditLog, ...prev.filter(item => item.id !== (payload.new as any).id)]);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('smt_audit_log_added', handleLocalAudit);
      supabase.removeChannel(channel);
    };
  }, []);

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'warning';
      case 'DELETE': return 'error';
      case 'LOGIN': return 'primary';
      case 'LOGOUT': return 'neutral';
      case 'EXPORT': return 'info';
      case 'STATUS_CHANGE': return 'warning';
      case 'PAYMENT': return 'success';
      case 'SYSTEM': return 'primary';
      default: return 'neutral';
    }
  };

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        (log.description || '').toLowerCase().includes(search.toLowerCase()) || 
        (log.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.module || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(search.toLowerCase());
      
      const matchModule = moduleFilter === '' || log.module === moduleFilter;
      const matchAction = actionFilter === '' || log.action === actionFilter;

      return matchSearch && matchModule && matchAction;
    });
  }, [logs, search, moduleFilter, actionFilter]);

  const modules = useMemo(() => {
    const defaultModules = [
      'Authentication',
      'Customers',
      'Leads & CRM',
      'Hajj Management',
      'Umrah Management',
      'Flight & Tickets',
      'Hotels & Accommodation',
      'Finance & Accounts',
      'HR & Administration',
      'Visa Processing',
      'System Administration'
    ];
    const extracted = Array.from(new Set(logs.map(l => l.module).filter(Boolean)));
    return Array.from(new Set([...defaultModules, ...extracted]));
  }, [logs]);

  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'STATUS_CHANGE', 'PAYMENT', 'SYSTEM'];

  // Test log creation
  const handleCreateTestLog = async () => {
    setTestSuccess(true);
    await audit.system(`System audit trail verified and active by ${user?.email || 'admin'}`, {
      test: true,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
    });
    setTimeout(() => setTestSuccess(false), 3000);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    setIsExporting(true);

    const headers = ['Time & Date', 'User Email', 'Action', 'Module', 'Description', 'Record ID'];
    const rows = filtered.map(l => [
      `"${new Date(l.created_at || '').toLocaleString()}"`,
      `"${l.user_email || 'System'}"`,
      `"${l.action}"`,
      `"${l.module}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.record_id || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    audit.export('Audit Trail', filtered.length);
    setIsExporting(false);
  };

  // Copy JSON
  const handleCopyJSON = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Audit Trail Active
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            Total {logs.length} logged actions
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleCreateTestLog}
            className={`btn-ghost text-xs flex items-center gap-1.5 border border-dashed transition-all ${
              testSuccess ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-neutral-200 hover:border-primary-400 text-neutral-600'
            }`}
            title="Create a test audit log to verify logging instantly"
          >
            {testSuccess ? <CheckCircle2 size={14} className="text-emerald-600" /> : <PlusCircle size={14} />}
            {testSuccess ? 'Verified Logged!' : 'Test Log Entry'}
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={isExporting || filtered.length === 0}
            className="btn-outline flex items-center gap-2 border-primary-200 text-primary-700 hover:bg-primary-50 shadow-xs text-xs sm:text-sm font-semibold"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 mb-5 shadow-xs border border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              className="input-field pl-9 w-full text-sm"
              placeholder="Search description, email, module, action..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <select 
              className="input-field w-full text-sm"
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
            >
              <option value="">All Modules ({modules.length})</option>
              {modules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select 
              className="input-field w-full text-sm"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              {actions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 flex items-center">
            <button 
              onClick={loadLogs} 
              className="btn-ghost w-full flex items-center justify-center p-2.5 rounded-xl border border-neutral-100 hover:bg-neutral-100 text-neutral-600 transition-colors"
              title="Refresh logs"
            >
              <History size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden border border-slate-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/75 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3 px-4">Time & Date</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4 text-center">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading audit history...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <EmptyState 
                      icon={Shield} 
                      title="No audit logs found" 
                      description={
                        search || moduleFilter || actionFilter 
                          ? "No records match your active filters. Try resetting the filters."
                          : "Activities and changes will automatically appear here live as users use the system."
                      } 
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
                        <Clock size={13} className="text-neutral-400 shrink-0" />
                        <span>{new Date(log.created_at || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-neutral-400 font-mono text-[11px]">{new Date(log.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 border border-primary-200/60">
                          {log.user_email?.charAt(0) || 'S'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-neutral-800 leading-tight">
                            {log.user_email ? log.user_email.split('@')[0] : 'System'}
                          </span>
                          <span className="text-[10px] text-neutral-400 leading-tight">
                            {log.user_email || 'System Operation'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <Badge variant={getActionBadge(log.action) as any} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100/90 border border-neutral-200/60 px-2.5 py-1 rounded-md">
                        {log.module}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="text-xs sm:text-sm text-neutral-800 font-medium line-clamp-1 group-hover:text-primary-700 transition-colors">
                        {log.description}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="btn-ghost text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Eye size={13} /> View Data
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="mt-6 flex items-start gap-3.5 p-4 bg-secondary-50/70 rounded-2xl border border-secondary-100 shadow-xs">
        <Shield size={20} className="text-secondary-600 shrink-0 mt-0.5" />
        <div className="text-xs text-secondary-800 leading-relaxed">
          <span className="font-bold text-secondary-900">Security & Compliance Notice:</span> This audit trail records all create, update, delete, login, and transaction operations across Sonar Madina Travels. Records are tamper-resistant and cannot be deleted by standard users. In case of data discrepancies, use this activity history to identify exact timeline, operator, and previous payload state.
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Record Details"
          size="lg"
        >
          <div className="space-y-4">
            {/* Header info card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Action</span>
                <Badge variant={getActionBadge(selectedLog.action) as any} className="text-[10px] uppercase font-bold">
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Module</span>
                <span className="font-semibold text-neutral-800">{selectedLog.module}</span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Operator / User</span>
                <span className="font-semibold text-neutral-800 truncate block">{selectedLog.user_email || 'System'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block mb-0.5">Timestamp</span>
                <span className="font-semibold text-neutral-800">{new Date(selectedLog.created_at || '').toLocaleString()}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-neutral-700 mb-1 block">Description</label>
              <div className="p-3 bg-white rounded-xl border border-neutral-200 text-sm text-neutral-800 font-medium">
                {selectedLog.description}
              </div>
            </div>

            {/* Record ID if present */}
            {selectedLog.record_id && (
              <div>
                <label className="text-xs font-bold text-neutral-700 mb-1 block">Record ID</label>
                <div className="p-2 bg-neutral-50 rounded-lg border border-neutral-200 text-xs font-mono text-neutral-700">
                  {selectedLog.record_id}
                </div>
              </div>
            )}

            {/* Payloads / JSON viewer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700">Payload & Changed Data (JSON)</label>
                <button 
                  onClick={handleCopyJSON}
                  className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5 text-neutral-600 hover:text-primary-600"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-64 scrollbar-thin">
                <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedLog(null)} 
                className="btn-primary text-xs px-5 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
