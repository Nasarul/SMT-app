import { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Search, CheckCircle, XCircle, Clock, AlertCircle, Filter, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useSettings } from '../../contexts/SettingsContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type: 'casual' | 'sick' | 'annual' | 'hajj_umrah_duty';
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  employees?: {
    full_name: string;
    designation: string;
    department: string;
  };
}

interface Employee {
  id: string;
  full_name: string;
}

const leaveTypeLabels: Record<string, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  annual: 'Annual Leave',
  hajj_umrah_duty: 'Hajj/Umrah Duty'
};

const statusColors: Record<string, string> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error'
};

export function LeavesPage() {
  const { company } = useSettings();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [form, setForm] = useState({
    employee_id: '',
    leave_type: 'casual',
    from_date: '',
    to_date: '',
    reason: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('leaves')
        .select('*, employees(full_name, designation, department)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: leaveData } = await query;
      const { data: empData } = await supabase.from('employees').select('id, full_name').eq('is_active', true);

      setApplications(leaveData || []);
      setEmployees(empData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApply = async () => {
    if (!form.employee_id || !form.from_date || !form.to_date) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    setError('');

    const start = new Date(form.from_date);
    const end = new Date(form.to_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

    try {
      const { error: err } = await supabase
        .from('leaves')
        .insert([{ ...form, days }]);

      if (err) throw err;

      setShowApplyModal(false);
      setForm({ employee_id: '', leave_type: 'casual', from_date: '', to_date: '', reason: '' });
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await supabase
        .from('leaves')
        .update({ status, approved_by: profile?.id })
        .eq('id', id);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getYearlyLeaveData = () => {
    const reportData: Record<string, any> = {};
    
    // Initialize with all active employees
    employees.forEach(emp => {
      reportData[emp.id] = {
        name: emp.full_name,
        casual: 0,
        sick: 0,
        annual: 0,
        duty: 0,
        total: 0
      };
    });

    // Fill with approved leaves for the selected year
    applications.filter(a => a.status === 'approved' && new Date(a.from_date).getFullYear() === selectedYear).forEach(app => {
      if (reportData[app.employee_id]) {
        const typeKey = app.leave_type === 'hajj_umrah_duty' ? 'duty' : app.leave_type;
        reportData[app.employee_id][typeKey] += app.days;
        reportData[app.employee_id].total += app.days;
      }
    });

    return Object.values(reportData);
  };

  const yearlyReport = getYearlyLeaveData();

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <button 
          onClick={() => window.print()}
          className="btn-outline flex items-center gap-2 border-primary-200 text-primary-700 shadow-sm hover:shadow-md transition-all"
        >
          <Printer size={16} /> Yearly Report
        </button>
        <button 
          onClick={() => setShowApplyModal(true)}
          className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> New Application
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 15mm; }
          nav, aside, header, .page-header, .no-print, .stat-card, .card:not(.print-report) { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .print-report { display: block !important; width: 100% !important; border: 1px solid #eee !important; box-shadow: none !important; }
          .print-report table { width: 100% !important; border-collapse: collapse !important; }
          .print-report th, .print-report td { border: 1px solid #ddd !important; padding: 10px !important; text-align: left; font-size: 11px !important; }
          .print-report th { background: #f8f9fa !important; -webkit-print-color-adjust: exact; }
          .print-header { display: block !important; margin-bottom: 30px; text-align: center; }
        }
        .print-report, .print-header { display: none; }
      `}} />

      {/* Print Header */}
      <div className="print-header">
        <div className="flex items-center gap-6 mb-4">
          {company.logo_url && (
            <img src={company.logo_url} alt="Logo" className="h-16 object-contain" />
          )}
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase text-neutral-900">{company.name}</h1>
            <p className="text-sm font-bold text-neutral-500 uppercase tracking-[0.3em] mt-1">Staff Yearly Leave Summary — {selectedYear}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-between text-[10px] font-bold border-y border-neutral-200 py-2">
          <span>REPORT TYPE: ANNUAL LEAVE AUDIT</span>
          <span>GENERATED: {new Date().toLocaleString()}</span>
        </div>
      </div>

      <div className="card print-report overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-neutral-50">
              <th className="p-4 font-bold text-neutral-600">Employee Name</th>
              <th className="p-4 font-bold text-neutral-600 text-center">Casual (CL)</th>
              <th className="p-4 font-bold text-neutral-600 text-center">Sick (SL)</th>
              <th className="p-4 font-bold text-neutral-600 text-center">Annual (AL)</th>
              <th className="p-4 font-bold text-neutral-600 text-center">Duty (DL)</th>
              <th className="p-4 font-bold text-center bg-primary-50 text-primary-700">Total Taken</th>
            </tr>
          </thead>
          <tbody>
            {yearlyReport.map((row, idx) => (
              <tr key={idx} className="border-t border-neutral-100">
                <td className="p-4 font-medium text-neutral-800">{row.name}</td>
                <td className="p-4 text-center text-neutral-600">{row.casual || '—'}</td>
                <td className="p-4 text-center text-neutral-600">{row.sick || '—'}</td>
                <td className="p-4 text-center text-neutral-600">{row.annual || '—'}</td>
                <td className="p-4 text-center text-neutral-600">{row.duty || '—'}</td>
                <td className="p-4 text-center font-bold text-primary-700 bg-primary-50/30">{row.total} Days</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-8 mt-12 hidden print:flex justify-between">
          <div className="text-center">
            <div className="w-40 border-b border-neutral-400 mb-2"></div>
            <p className="text-[10px] font-bold">HR Supervisor</p>
          </div>
          <div className="text-center">
            <div className="w-40 border-b border-neutral-400 mb-2"></div>
            <p className="text-[10px] font-bold">Managing Director</p>
          </div>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center text-warning-600">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full">Pending</span>
          </div>
          <div className="text-2xl font-bold mt-2">{applications.filter(a => a.status === 'pending').length}</div>
          <div className="text-xs text-neutral-400">Applications awaiting review</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center text-success-600">
              <CheckCircle size={20} />
            </div>
            <span className="text-xs font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded-full">Approved</span>
          </div>
          <div className="text-2xl font-bold mt-2">{applications.filter(a => a.status === 'approved').length}</div>
          <div className="text-xs text-neutral-400">This year so far</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-error-50 rounded-lg flex items-center justify-center text-error-600">
              <XCircle size={20} />
            </div>
            <span className="text-xs font-bold text-error-600 bg-error-50 px-2 py-0.5 rounded-full">Rejected</span>
          </div>
          <div className="text-2xl font-bold mt-2">{applications.filter(a => a.status === 'rejected').length}</div>
          <div className="text-xs text-neutral-400">Last 30 days</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Filter size={18} className="text-neutral-400" />
          <div className="flex bg-neutral-100 p-1 rounded-lg">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === s ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <select 
            className="text-xs font-bold bg-white border border-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search by name..." />
        </div>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Employee</th>
                <th className="table-header text-left">Leave Type</th>
                <th className="table-header text-center">Duration</th>
                <th className="table-header text-left">Reason</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">Loading leave data...</td></tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState 
                      icon={Calendar} 
                      title="No applications found" 
                      description="There are no leave applications matching your current filter."
                    />
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="font-medium text-neutral-800">{app.employees?.full_name}</div>
                      <div className="text-xs text-neutral-400">{app.employees?.designation}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm text-neutral-700">{leaveTypeLabels[app.leave_type]}</div>
                      <div className="text-[10px] text-neutral-400 uppercase font-semibold">{app.employees?.department}</div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="text-sm font-medium text-neutral-700">{app.days} Day{app.days > 1 ? 's' : ''}</div>
                      <div className="text-xs text-neutral-400">{formatDate(app.from_date)} - {formatDate(app.to_date)}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-xs text-neutral-600 line-clamp-2 max-w-xs">{app.reason}</div>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={statusColors[app.status] as any}>
                        {app.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="table-cell text-center">
                      {app.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => updateStatus(app.id, 'approved')}
                            className="p-1.5 rounded-lg hover:bg-success-50 text-success-600 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button 
                            onClick={() => updateStatus(app.id, 'rejected')}
                            className="p-1.5 rounded-lg hover:bg-error-50 text-error-600 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-300 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal 
        isOpen={showApplyModal} 
        onClose={() => setShowApplyModal(false)} 
        title="Apply for Leave"
        size="lg"
      >
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Employee *</label>
              <select 
                className="input-field"
                value={form.employee_id}
                onChange={e => setForm({...form, employee_id: e.target.value})}
              >
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Leave Type</label>
              <select 
                className="input-field"
                value={form.leave_type}
                onChange={e => setForm({...form, leave_type: e.target.value as any})}
              >
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="annual">Annual Leave</option>
                <option value="hajj_umrah_duty">Hajj/Umrah Duty</option>
              </select>
            </div>
            <div className="hidden sm:block" />
            <div>
              <label className="label">From Date *</label>
              <input 
                type="date" 
                className="input-field" 
                value={form.from_date}
                onChange={e => setForm({...form, from_date: e.target.value})}
              />
            </div>
            <div>
              <label className="label">To Date *</label>
              <input 
                type="date" 
                className="input-field" 
                value={form.to_date}
                onChange={e => setForm({...form, to_date: e.target.value})}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Reason</label>
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="Briefly explain the reason for leave..."
                value={form.reason}
                onChange={e => setForm({...form, reason: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setShowApplyModal(false)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={handleApply}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
