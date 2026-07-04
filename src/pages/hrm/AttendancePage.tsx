import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, Printer, Users } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/constants';
import { useSettings } from '../../contexts/SettingsContext';
import { supabase } from '../../lib/supabase';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  designation: string;
}

interface LeaveRecord {
  id: string;
  employee_id: string;
  from_date: string;
  to_date: string;
  status: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string;
  check_out: string;
  status: string;
  notes: string;
}

export function AttendancePage() {
  const { company } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Range State
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [success, setSuccess] = useState('');
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayDate, setHolidayDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidaySaving, setHolidaySaving] = useState(false);
  const [printingEmployee, setPrintingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (printingEmployee) {
      document.body.classList.add('is-printing-record');
    } else {
      document.body.classList.remove('is-printing-record');
    }
    return () => document.body.classList.remove('is-printing-record');
  }, [printingEmployee]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [empRes, attRes, leaveRes] = await Promise.all([
      supabase.from('employees').select('id, employee_code, full_name, department, designation').eq('is_active', true).order('full_name'),
      supabase.from('attendance').select('*').gte('attendance_date', startDate).lte('attendance_date', endDate),
      supabase.from('leaves').select('*').eq('status', 'approved').or(`from_date.lte.${endDate},to_date.gte.${startDate}`),
    ]);
    setEmployees(empRes.data || []);
    setAttendance(attRes.data || []);
    setLeaves(leaveRes.data || []);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const getDaysArray = (start: string, end: string) => {
    const arr = [];
    const dt = new Date(start);
    const endDt = new Date(end);
    while (dt <= endDt) {
      arr.push(new Date(dt).toISOString().split('T')[0]);
      dt.setDate(dt.getDate() + 1);
    }
    return arr;
  };

  const dates = getDaysArray(startDate, endDate);

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return <span className="text-neutral-200 text-[10px]">·</span>;
    switch (status) {
      case 'present': return <span className="text-success-600 font-bold text-[10px]">✓</span>;
      case 'absent': return <span className="text-error-600 font-bold text-[10px]">✗</span>;
      case 'leave': return <span className="text-primary-500 font-bold text-[10px]">–</span>;
      case 'late': return <span className="text-warning-600 font-bold text-[10px]">L</span>;
      case 'half_day': return <span className="text-warning-500 font-bold text-[10px]">½</span>;
      case 'holiday': return <span className="text-neutral-400 font-bold text-[10px]">H</span>;
      default: return <span className="text-neutral-400 font-bold text-[10px]">·</span>;
    }
  };

  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 5 || day === 6; // Friday and Saturday
  };

  const calculateSummary = (empId: string) => {
    const empAtt = attendance.filter(a => a.employee_id === empId);
    const empLeaves = leaves.filter(l => l.employee_id === empId);
    
    // Calculate leave days that fall within current range and don't have attendance records
    let autoLeaveDays = 0;
    dates.forEach(date => {
      const hasAtt = empAtt.some(a => a.attendance_date === date);
      if (!hasAtt) {
        const onLeave = empLeaves.some(l => date >= l.from_date && date <= l.to_date);
        if (onLeave) autoLeaveDays++;
      }
    });

    return {
      present: empAtt.filter(a => a.status === 'present' || a.status === 'late').length,
      absent: empAtt.filter(a => a.status === 'absent').length,
      leave: empAtt.filter(a => a.status === 'leave' || a.status === 'half_day').length + autoLeaveDays,
    };
  };

  const downloadAttendance = () => {
    setPrintingEmployee(null); // Ensure full matrix is printed
    setTimeout(() => window.print(), 100);
  };

  const handleIndividualPrint = (emp: Employee) => {
    setPrintingEmployee(emp);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleMarkHoliday = async () => {
    if (!window.confirm(`Are you sure you want to mark ${formatDate(holidayDate)} as a public holiday for ALL employees?`)) return;
    
    setHolidaySaving(true);
    try {
      const upserts = employees.map(emp => ({
        employee_id: emp.id,
        attendance_date: holidayDate,
        status: 'holiday',
      }));

      const { error } = await supabase.from('attendance').upsert(upserts, {
        onConflict: 'employee_id,attendance_date',
      });

      if (error) throw error;

      setSuccess(`Holiday marked for ${formatDate(holidayDate)}`);
      setShowHolidayModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Error: ${error.message}`);
    } finally {
      setHolidaySaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in print:p-0">
      <div className="page-header no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <h2 className="page-title">Attendance Matrix</h2>
            <p className="text-sm text-neutral-500">Professional staff attendance tracking & reporting</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-neutral-50 border-r border-neutral-200 text-xs font-bold text-neutral-500 uppercase">From</div>
            <input type="date" className="px-3 py-1.5 text-sm focus:outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <div className="px-3 py-1.5 bg-neutral-50 border-x border-neutral-200 text-xs font-bold text-neutral-500 uppercase">To</div>
            <input type="date" className="px-3 py-1.5 text-sm focus:outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={() => setShowHolidayModal(true)} className="btn-outline flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50">
            <Calendar size={16} />
            <span>Mark Holiday</span>
          </button>
          <button onClick={downloadAttendance} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-200/50">
            <Printer size={16} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: portrait; margin: 5mm; }
          nav, aside, header, .no-print, .page-header { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .card { border: none !important; box-shadow: none !important; }
          .print-container { width: 100% !important; display: block !important; }
          .matrix-container { overflow: visible !important; height: auto !important; max-height: none !important; }
          .matrix-table { font-size: 7px !important; width: 100% !important; border-collapse: collapse !important; }
          .matrix-table th, .matrix-table td { padding: 2px 1px !important; border: 1px solid #eee !important; min-width: 0 !important; }
          .matrix-table th div { transform: rotate(-90deg); height: 40px; display: flex; align-items: center; justify-content: center; }
          .sticky-col { position: static !important; background: transparent !important; width: 80px !important; }
          .print-header { display: block !important; margin-bottom: 15px; }
          
          /* Layout Isolation */
          body.is-printing-record .main-matrix-view { display: none !important; }
          body.is-printing-record .individual-print-view { display: block !important; width: 100% !important; position: absolute; top: 0; left: 0; }
          
          body:not(.is-printing-record) .main-matrix-view { display: block !important; }
          body:not(.is-printing-record) .individual-print-view { display: none !important; }

          /* Layout Styling */
          .az-title { color: #111; font-weight: 800; }
          .az-red-border { border-top: 2px solid #333; }
          .az-label { color: #444; font-weight: 800; text-transform: uppercase; font-size: 9px; }
          .az-item-row { border-bottom: 1px solid #f0f0f0; }
        }
        .print-header, .individual-print-view { display: none; }
        .matrix-container { overflow-x: auto; }
        .matrix-table { border-collapse: separate; border-spacing: 0; }
        .sticky-col { position: sticky; left: 0; z-index: 20; background: white; border-right: 2px solid #f0f0f0; }
        .sticky-header { position: sticky; top: 0; z-index: 30; background: #f8fafc; }
        .sticky-both { position: sticky; top: 0; left: 0; z-index: 40; background: #f8fafc; border-right: 2px solid #f0f0f0; }
        .weekend-col { background-color: #fff7ed !important; }
        .summary-col { background-color: #f1f5f9 !important; font-weight: bold; min-width: 45px; text-align: center; border-left: 1px solid #e2e8f0; }
      `}} />

      <div className={`main-matrix-view ${printingEmployee ? 'no-print' : ''}`}>
        {/* Print Header */}
        <div className="print-header border-b border-neutral-200 pb-4 mb-6">
          <div className="flex items-center gap-6 justify-center">
            {company.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-16 object-contain" />
            )}
            <div className="text-left">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-neutral-900 leading-none">{company.name}</h1>
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">Staff Monthly Attendance Audit</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center text-[8px] font-bold px-4">
            <p>PERIOD: {formatDate(startDate)} — {formatDate(endDate)}</p>
            <p>PRINTED: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm no-print">
            <CheckCircle size={15} /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-neutral-500 font-medium animate-pulse">Analyzing Attendance Records...</p>
          </div>
        ) : (
          <div className="card shadow-xl shadow-neutral-200/50 border-neutral-200/60 overflow-hidden">
            <div className="matrix-container custom-scrollbar">
              <table className="matrix-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky-both p-4 text-left font-bold text-neutral-600 bg-neutral-50 border-b border-neutral-200">
                      Employee
                    </th>
                    {dates.map(date => {
                      const isWk = isWeekend(date);
                      return (
                        <th key={date} className={`sticky-header p-2 text-center border-b border-neutral-200 ${isWk ? 'weekend-col' : 'bg-white'}`}>
                          <div>
                            <span className={`font-black ${isWk ? 'text-orange-600' : 'text-neutral-700'}`}>{new Date(date).getDate()}</span>
                            <span className="text-[8px] ml-1 opacity-50">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky-header summary-col p-2 border-b border-neutral-200 text-success-700">PR</th>
                    <th className="sticky-header summary-col p-2 border-b border-neutral-200 text-error-700">AB</th>
                    <th className="sticky-header summary-col p-2 border-b border-neutral-200 text-primary-700">LV</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const summary = calculateSummary(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="sticky-col p-4 border-b border-neutral-100">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-neutral-800 leading-none truncate w-24" title={emp.full_name}>{emp.full_name}</div>
                                <button 
                                  onClick={() => handleIndividualPrint(emp)}
                                  className="no-print p-1 hover:bg-primary-50 text-primary-400 hover:text-primary-600 rounded transition-colors"
                                  title="Print Individual Attendance"
                                >
                                  <Printer size={12} />
                                </button>
                              </div>
                              <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-tight mt-1">
                                {emp.employee_code} · {emp.designation}
                              </div>
                            </div>
                          </div>
                        </td>
                        {dates.map(date => {
                          const rec = attendance.find(a => a.employee_id === emp.id && a.attendance_date === date);
                          const isOnLeave = !rec && leaves.some(l => 
                            l.employee_id === emp.id && 
                            date >= l.from_date && 
                            date <= l.to_date
                          );
                          const isWk = isWeekend(date);
                          return (
                            <td key={date} className={`p-2 text-center border-b border-neutral-100 ${isWk ? 'weekend-col/50 bg-orange-50/20' : ''}`}>
                              <div className="flex items-center justify-center">
                                {getStatusIcon(rec?.status || (isOnLeave ? 'leave' : undefined))}
                              </div>
                            </td>
                          );
                        })}
                        <td className="summary-col p-2 border-b border-neutral-100 text-success-700">{summary.present}</td>
                        <td className="summary-col p-2 border-b border-neutral-100 text-error-700">{summary.absent}</td>
                        <td className="summary-col p-2 border-b border-neutral-100 text-primary-700">{summary.leave}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-6 no-print">
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest border-r pr-4 border-neutral-100">Legend</div>
            <div className="flex gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5"><span className="text-success-600 font-bold">✓</span> Present</div>
              <div className="flex items-center gap-1.5"><span className="text-error-600 font-bold">✗</span> Absent</div>
              <div className="flex items-center gap-1.5"><span className="text-primary-500 font-bold">–</span> Leave</div>
              <div className="flex items-center gap-1.5"><span className="text-warning-600 font-bold">L</span> Late</div>
              <div className="flex items-center gap-1.5"><span className="text-neutral-400 font-bold">H</span> Holiday</div>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Individual Attendance (Forced Portrait via State) */}
      {printingEmployee && (
        <div className="individual-print-view min-h-screen bg-white p-12 relative overflow-hidden is-printing-individual">
          
          <div className="flex items-center gap-6 mb-8 border-b-2 border-neutral-100 pb-6">
            {company.logo_url && (
              <img src={company.logo_url} alt="Logo" className="h-20 object-contain" />
            )}
            <div className="text-left">
              <h1 className="text-4xl font-black uppercase text-neutral-900 tracking-tighter leading-none">{company.name}</h1>
              <p className="text-xs font-bold text-neutral-400 mt-2 uppercase tracking-[0.3em]">Staff Attendance Record</p>
            </div>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase mb-2">Employee Details</p>
              <p className="text-xl font-black text-neutral-900 leading-tight">{printingEmployee.full_name}</p>
              <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">{printingEmployee.designation}</p>
              <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">{printingEmployee.department}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-600"><strong>Staff Code:</strong> {printingEmployee.employee_code}</p>
              <p className="text-sm font-medium text-neutral-600"><strong>Period:</strong> {formatDate(startDate)} — {formatDate(endDate)}</p>
              <p className="text-sm font-medium text-neutral-600"><strong>Generated:</strong> {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="mb-10">
            <div className="flex az-red-border py-2 px-2 bg-neutral-50">
              <div className="w-[20%] az-label">Date</div>
              <div className="w-[50%] az-label">Day / Remarks</div>
              <div className="w-[30%] az-label text-right">Status</div>
            </div>
            
            {dates.map((date, idx) => {
              const rec = attendance.find(a => a.employee_id === printingEmployee.id && a.attendance_date === date);
              const isOnLeave = !rec && leaves.some(l => 
                l.employee_id === printingEmployee.id && 
                date >= l.from_date && 
                date <= l.to_date
              );
              const isWk = isWeekend(date);
              const status = rec?.status || (isOnLeave ? 'leave' : (isWk ? 'holiday' : undefined));
              
              return (
                <div key={date} className="az-item-row flex py-3 px-2">
                  <div className="w-[20%] text-sm font-bold text-neutral-400">{(idx + 1).toString().padStart(2, '0')}. {new Date(date).getDate().toString().padStart(2, '0')} {new Date(date).toLocaleDateString('en-US', { month: 'short' })}</div>
                  <div className="w-[50%] text-sm font-bold text-neutral-800">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                    {isWk && <span className="ml-2 text-[10px] text-neutral-300 font-black uppercase tracking-tight">[ Weekend ]</span>}
                  </div>
                  <div className="w-[30%] text-right flex justify-end items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-neutral-400">({status || '—'})</span>
                    <span className="text-base">{getStatusIcon(status)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end mb-16">
            <div className="w-[40%] space-y-3">
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <span className="text-sm font-bold text-neutral-400 uppercase">Present (PR)</span>
                <span className="text-sm font-black text-neutral-900">{calculateSummary(printingEmployee.id).present}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <span className="text-sm font-bold text-neutral-400 uppercase">Absent (AB)</span>
                <span className="text-sm font-black text-neutral-900">{calculateSummary(printingEmployee.id).absent}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-1">
                <span className="text-sm font-bold text-neutral-400 uppercase">Leave (LV)</span>
                <span className="text-sm font-black text-neutral-900">{calculateSummary(printingEmployee.id).leave}</span>
              </div>
              <div className="flex justify-between pt-3 border-b-4 border-double border-neutral-900">
                <span className="text-lg font-black uppercase tracking-tighter">Working Days</span>
                <span className="text-xl font-black text-neutral-900">{calculateSummary(printingEmployee.id).present + calculateSummary(printingEmployee.id).leave}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center px-10">
            <div className="text-center">
              <div className="w-56 border-b border-neutral-300 mb-2"></div>
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Employee Signature</p>
            </div>
            <div className="text-center">
              <div className="w-56 border-b border-neutral-900 mb-2"></div>
              <p className="text-[10px] font-black uppercase text-neutral-900 tracking-widest">Authorized Official</p>
            </div>
          </div>
        </div>
      )}

      {/* Mark Holiday Modal */}
      <Modal isOpen={showHolidayModal} onClose={() => setShowHolidayModal(false)} title="Mark Public Holiday" size="sm">
        <div className="p-5 space-y-4">
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg text-xs text-orange-800 leading-relaxed">
            <strong>Note:</strong> Marking a holiday will set the status to "Holiday" (H) for all active employees on the selected date. This will override any existing records for that day.
          </div>
          <div>
            <label className="label">Select Holiday Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={holidayDate} 
              onChange={e => setHolidayDate(e.target.value)} 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowHolidayModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button 
              onClick={handleMarkHoliday} 
              disabled={holidaySaving} 
              className="btn-primary flex-1 bg-orange-600 hover:bg-orange-700 border-orange-700 flex items-center justify-center gap-2"
            >
              {holidaySaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
              Confirm Holiday
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
