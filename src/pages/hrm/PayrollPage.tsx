import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Calendar, CheckCircle2, AlertCircle, FileText, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import { formatBDT, formatDate } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string;
  department: string;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  transport_allowance: number;
  mobile_allowance: number;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_salary: number;
  house_rent: number;
  medical_allowance: number;
  transport_allowance: number;
  mobile_allowance: number;
  other_allowances: number;
  bonus: number;
  net_payable: number;
  status: 'draft' | 'paid';
  paid_at: string | null;
  payment_mode: string;
  employees?: {
    full_name: string;
    designation: string;
    employee_code: string;
    department: string;
  };
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function numberToWords(num: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  if (num === 0) return 'Zero';

  function chunkToWords(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str;
  }

  let words = '';
  let scaleIndex = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      words = chunkToWords(chunk) + scales[scaleIndex] + ' ' + words;
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }
  return words.trim() + ' Taka Only';
}

export function PayrollPage() {
  const { company } = useSettings();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [printingRecord, setPrintingRecord] = useState<PayrollRecord | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: payrollData } = await supabase
        .from('payroll')
        .select('*, employees(full_name, designation, employee_code, department)')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      const { data: employeeData } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);

      setRecords(payrollData || []);
      setEmployees(employeeData || []);
    } catch (err) {
      console.error('Error loading payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const processPayroll = async () => {
    setProcessing(true);
    setError('');
    try {
      const payrollToInsert = employees.map(emp => {
        const net = Number(emp.basic_salary) + Number(emp.house_rent) + 
                    Number(emp.medical_allowance) + Number(emp.transport_allowance) + 
                    Number(emp.mobile_allowance);
        
        return {
          employee_id: emp.id,
          month: selectedMonth,
          year: selectedYear,
          basic_salary: emp.basic_salary,
          house_rent: emp.house_rent,
          medical_allowance: emp.medical_allowance,
          transport_allowance: emp.transport_allowance,
          mobile_allowance: emp.mobile_allowance,
          net_payable: net,
          status: 'draft'
        };
      });

      const { error: insertError } = await supabase
        .from('payroll')
        .upsert(payrollToInsert, { onConflict: 'employee_id,month,year' });

      if (insertError) throw insertError;

      setSuccess(`Payroll for ${months[selectedMonth - 1]} ${selectedYear} processed successfully!`);
      setShowProcessModal(false);
      loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await supabase
        .from('payroll')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingRecord(null);
      setIsExportingPDF(false);
    };

    window.addEventListener('afterprint', handleAfterPrint);

    if (printingRecord) {
      document.body.classList.add('is-printing-individual');
    } else if (isExportingPDF) {
      document.body.classList.add('is-printing-landscape');
    } else {
      document.body.classList.remove('is-printing-individual');
      document.body.classList.remove('is-printing-landscape');
    }

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('is-printing-individual');
      document.body.classList.remove('is-printing-landscape');
    };
  }, [printingRecord, isExportingPDF]);

  const totalPayroll = records.reduce((sum, r) => sum + Number(r.net_payable), 0);
  const paidCount = records.filter(r => r.status === 'paid').length;
  const pendingCount = records.length - paidCount;

  const handlePrintPayslip = (record: PayrollRecord) => {
    setPrintingRecord(record);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: ${isExportingPDF ? 'landscape' : 'portrait'}; 
            margin: 5mm; 
          }
          
          body, html { height: auto !important; background: white !important; }

          /* Landscape Logic (Export PDF) */
          body.is-printing-landscape .main-payroll-view,
          body.is-printing-landscape .payslip-view { display: none !important; }
          body.is-printing-landscape .landscape-export-view { display: block !important; }
          
          /* Portrait Logic (Individual Payslip) */
          body.is-printing-individual .main-payroll-view,
          body.is-printing-individual .landscape-export-view { display: none !important; }
          body.is-printing-individual .payslip-view { display: block !important; }
          
          /* Defaults when not printing or printing standard screen */
          body:not(.is-printing-individual):not(.is-printing-landscape) .landscape-export-view { display: none !important; }
          body:not(.is-printing-individual):not(.is-printing-landscape) .payslip-view { display: none !important; }
          
          /* Shared Print Overrides */
          nav, aside, header, button, .no-print, .page-header { display: none !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
          
          /* Table Formatting */
          .export-table { width: 100% !important; border-collapse: collapse !important; font-size: 8px !important; }
          .export-table th, .export-table td { border: 0.5pt solid #ccc !important; padding: 4px !important; }
          .export-table th { background: #f0f0f0 !important; font-weight: bold !important; text-transform: uppercase !important; }
          .total-row { background: #fafafa !important; font-weight: 900 !important; }
          
          /* Signature Logic */
          .sig-box { border-top: 1px solid #000; width: 180px; text-align: center; font-size: 9px; font-weight: bold; margin-top: 30px; page-break-inside: avoid; }
          
          /* Individual Payslip Adjustments */
          .payslip-view { padding: 5mm !important; height: auto !important; min-height: 0 !important; }
          .landscape-export-view { padding: 5mm !important; height: auto !important; min-height: 0 !important; }
          
          /* Footer Positioning */
          .print-footer { 
            position: fixed; 
            bottom: 5mm; 
            right: 10mm; 
            font-size: 8px; 
            font-weight: bold; 
            color: #a3a3a3; 
            display: none;
          }
          body.is-printing-landscape .print-footer { display: block !important; }
        }
        .landscape-export-view, .payslip-view, .print-footer { display: none; }
      `}} />

      <div className={`main-payroll-view ${printingRecord || isExportingPDF ? 'no-print' : ''}`}>
        {success && (
          <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm animate-fade-in no-print">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        <div className="page-header no-print">
          <div>
            <h2 className="page-title">Payroll Management</h2>
            <p className="text-sm text-neutral-500">Process and track monthly employee salaries</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsExportingPDF(true);
                setTimeout(() => {
                  window.print();
                }, 500);
              }}
              className="btn-outline flex items-center gap-2 border-primary-200 text-primary-600 hover:bg-primary-50"
            >
              <Printer size={16} />
              <span>Export Report/PDF</span>
            </button>
            <button onClick={() => setShowProcessModal(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Process Monthly Payroll
            </button>
          </div>
        </div>

        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-primary-500" />
            <select 
              className="input-field w-40"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select 
              className="input-field w-28"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-xs text-neutral-400 uppercase font-semibold">Total Payroll</div>
              <div className="text-lg font-bold text-neutral-800">{formatBDT(totalPayroll)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-400 uppercase font-semibold">Paid</div>
              <div className="text-lg font-bold text-success-600">{paidCount}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-400 uppercase font-semibold">Pending</div>
              <div className="text-lg font-bold text-warning-600">{pendingCount}</div>
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="card print-report overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="table-header text-left">Employee</th>
                  <th className="table-header text-right">Basic</th>
                  <th className="table-header text-right">Allowances</th>
                  <th className="table-header text-right">Net Payable</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-center no-print">Active</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-neutral-400">Loading payroll data...</td></tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState 
                        icon={DollarSign} 
                        title="No payroll records found" 
                        description={`Payroll for ${months[selectedMonth - 1]} ${selectedYear} hasn't been processed yet.`}
                      />
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="font-medium text-neutral-800">{record.employees?.full_name}</div>
                        <div className="text-xs text-neutral-400">{record.employees?.designation} · {record.employees?.employee_code}</div>
                      </td>
                      <td className="table-cell text-right font-mono text-sm">{formatBDT(record.basic_salary)}</td>
                      <td className="table-cell text-right font-mono text-sm text-success-600">
                        +{formatBDT(Number(record.house_rent) + Number(record.medical_allowance) + Number(record.transport_allowance) + Number(record.mobile_allowance) + Number(record.bonus))}
                      </td>
                      <td className="table-cell text-right font-bold text-neutral-800">{formatBDT(record.net_payable)}</td>
                      <td className="table-cell text-center">
                        <Badge variant={record.status === 'paid' ? 'success' : 'warning'}>
                          {record.status.toUpperCase()}
                        </Badge>
                        {record.paid_at && (
                          <div className="text-[10px] text-neutral-400 mt-1">{formatDate(record.paid_at)}</div>
                        )}
                      </td>
                      <td className="table-cell text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          {record.status === 'draft' && (
                            <button 
                              onClick={() => markAsPaid(record.id)}
                              className="p-1.5 rounded-lg hover:bg-success-50 text-success-600 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => handlePrintPayslip(record)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors" 
                            title="Print Payslip"
                          >
                            <Printer size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Payslip (Forced Portrait via State) */}
      {printingRecord && (
        <div className="payslip-view bg-white p-4 relative overflow-hidden is-printing-payslip">
          
          <div className="flex items-center gap-6 mb-4 border-b-2 border-neutral-100 pb-4">
            {company.logo_url && <img src={company.logo_url} alt="Logo" className="h-16 object-contain" />}
            <div className="text-left">
              <h1 className="text-2xl font-black uppercase text-neutral-900 tracking-tight leading-none">{company.name}</h1>
              <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-[0.2em]">Monthly Employee Payslip</p>
            </div>
          </div>

          <div className="flex justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold text-neutral-400 uppercase mb-2">Staff Information</p>
              <p className="text-xl font-black text-neutral-900 leading-tight">{printingRecord.employees?.full_name}</p>
              <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">{printingRecord.employees?.designation}</p>
              <p className="text-sm font-medium text-neutral-600 uppercase tracking-tight">{printingRecord.employees?.department || 'Operations'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-600"><strong>Staff Code:</strong> {printingRecord.employees?.employee_code}</p>
              <p className="text-sm font-medium text-neutral-600"><strong>Pay Period:</strong> {months[selectedMonth-1]} {selectedYear}</p>
              <p className="text-sm font-medium text-neutral-600"><strong>Print Date:</strong> {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex az-red-border py-2 px-2 bg-neutral-50">
              <div className="w-[10%] az-label font-bold underline">Item</div>
              <div className="w-[60%] az-label font-bold underline">Salary Components</div>
              <div className="w-[30%] az-label font-bold underline text-right">Amount</div>
            </div>
            
            <div className="az-item-row flex py-1 px-2">
              <div className="w-[10%] text-sm font-bold text-neutral-400">01.</div>
              <div className="w-[60%] text-sm font-bold text-neutral-800">Basic Salary</div>
              <div className="w-[30%] text-sm font-black text-neutral-900 text-right">{formatBDT(printingRecord.basic_salary)}</div>
            </div>
            
            <div className="az-item-row flex py-1 px-2">
              <div className="w-[10%] text-sm font-bold text-neutral-400">02.</div>
              <div className="w-[60%] text-sm font-bold text-neutral-800">House Rent & Medical Allowance</div>
              <div className="w-[30%] text-sm font-black text-neutral-900 text-right">{formatBDT(Number(printingRecord.house_rent) + Number(printingRecord.medical_allowance))}</div>
            </div>

            <div className="az-item-row flex py-1 px-2">
              <div className="w-[10%] text-sm font-bold text-neutral-400">03.</div>
              <div className="w-[60%] text-sm font-bold text-neutral-800">Transport & Special Allowances</div>
              <div className="w-[30%] text-sm font-black text-neutral-900 text-right">{formatBDT(Number(printingRecord.transport_allowance) + Number(printingRecord.mobile_allowance) + Number(printingRecord.bonus))}</div>
            </div>
          </div>

          <div className="flex justify-end mb-8">
            <div className="w-[40%] space-y-3">
              <div className="flex justify-between pt-3 border-b-4 border-double border-neutral-900">
                <span className="text-lg font-black uppercase tracking-tighter">Net Payable</span>
                <span className="text-xl font-black text-neutral-900">{formatBDT(printingRecord.net_payable)}</span>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <p className="text-xs italic text-neutral-400 font-bold uppercase tracking-tight">Amount in Words: {numberToWords(printingRecord.net_payable)}</p>
          </div>

          <div className="mt-8 text-[10px] italic text-neutral-500 font-medium">
            Note: This is a system-generated official payroll record of {company.name}.
          </div>

          <div className="flex justify-between items-end mt-12">
            <div className="sig-box">PREPARED BY</div>
            <div className="sig-box">CHECKED BY</div>
            <div className="sig-box">APPROVED BY</div>
          </div>
        </div>
      )}

      {/* Landscape Official Export View */}
      <div className="landscape-export-view bg-white p-4 relative">
        <div className="flex justify-between items-start border-b-2 border-neutral-900 pb-4 mb-4">
          <div className="flex items-center gap-6">
            {company.logo_url && <img src={company.logo_url} alt="Logo" className="h-14 object-contain" />}
            <div>
              <h1 className="text-2xl font-black uppercase text-neutral-900 tracking-tight leading-none">{company.name}</h1>
              <p className="text-[10px] font-bold text-neutral-400 mt-1 uppercase tracking-[0.2em]">Official Monthly Payroll Statement</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Payroll Period</div>
            <div className="text-2xl font-black text-neutral-900 uppercase">{months[selectedMonth-1]} {selectedYear}</div>
            <div className="text-[10px] font-medium text-neutral-400 mt-1 uppercase">Generated: {new Date().toLocaleString()}</div>
          </div>
        </div>

        <table className="export-table">
          <thead>
            <tr>
              <th>SL</th>
              <th>Employee Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th className="text-right">Basic</th>
              <th className="text-right">H. Rent</th>
              <th className="text-right">Medical</th>
              <th className="text-right">Trans.</th>
              <th className="text-right">Mob/Bon</th>
              <th className="text-right bg-neutral-100">Net Payable</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={r.id}>
                <td className="text-center">{(i + 1).toString().padStart(2, '0')}</td>
                <td className="font-bold">{r.employees?.full_name}</td>
                <td>{r.employees?.designation}</td>
                <td className="capitalize">{r.employees?.department || 'Operations'}</td>
                <td className="text-right">{formatBDT(r.basic_salary)}</td>
                <td className="text-right">{formatBDT(r.house_rent)}</td>
                <td className="text-right">{formatBDT(r.medical_allowance)}</td>
                <td className="text-right">{formatBDT(r.transport_allowance)}</td>
                <td className="text-right">{formatBDT(Number(r.mobile_allowance) + Number(r.bonus))}</td>
                <td className="text-right font-black bg-neutral-50">{formatBDT(r.net_payable)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td colSpan={4} className="text-right">GRAND TOTALS</td>
              <td className="text-right">{formatBDT(records.reduce((s, r) => s + Number(r.basic_salary), 0))}</td>
              <td className="text-right">{formatBDT(records.reduce((s, r) => s + Number(r.house_rent), 0))}</td>
              <td className="text-right">{formatBDT(records.reduce((s, r) => s + Number(r.medical_allowance), 0))}</td>
              <td className="text-right">{formatBDT(records.reduce((s, r) => s + Number(r.transport_allowance), 0))}</td>
              <td className="text-right">{formatBDT(records.reduce((s, r) => s + Number(r.mobile_allowance) + Number(r.bonus), 0))}</td>
              <td className="text-right text-lg font-black bg-neutral-200">{formatBDT(totalPayroll)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 text-[10px] font-bold uppercase text-neutral-700 italic">
          AMOUNT IN WORDS: {numberToWords(totalPayroll)}
        </div>

        <div className="mt-6 mb-10 text-[10px] italic text-neutral-500 font-medium">
          Note: This is a system-generated official payroll record of {company.name}.
        </div>

        <div className="flex justify-between items-end mt-8">
          <div className="sig-box">PREPARED BY</div>
          <div className="sig-box">CHECKED BY</div>
          <div className="sig-box">APPROVED BY</div>
        </div>

        <div className="print-footer">
          Page 01 of 01
        </div>
      </div>

      {/* Process Payroll Modal */}
      <Modal 
        isOpen={showProcessModal} 
        onClose={() => setShowProcessModal(false)} 
        title="Process Monthly Payroll"
      >
        <div className="p-5">
          <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl mb-6">
            <AlertCircle className="text-primary-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-semibold text-primary-800">Confirm Payroll Generation</h4>
              <p className="text-xs text-primary-600 mt-1">
                This will generate draft payroll records for all {employees.length} active employees 
                for the month of <strong>{months[selectedMonth - 1]} {selectedYear}</strong>. 
                Existing draft records will be updated.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-xs mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={() => setShowProcessModal(false)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={processPayroll}
              disabled={processing || employees.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : <FileText size={16} />}
              {processing ? 'Processing...' : 'Generate Payroll'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
