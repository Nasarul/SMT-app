import { useState, useEffect } from 'react';
import { Download, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

export function CashBookPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => { loadData(); }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    const startDate = selectedMonth + '-01';
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split('T')[0];
    const { data } = await supabase.from('accounts_vouchers')
      .select('*')
      .gte('voucher_date', startDate)
      .lt('voucher_date', endDate)
      .in('payment_mode', ['cash'])
      .order('voucher_date', { ascending: true });
    setVouchers(data || []);
    setLoading(false);
  };

  const totalReceipts = vouchers.filter(v => v.voucher_type === 'receipt').reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const totalPayments = vouchers.filter(v => v.voucher_type === 'payment').reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const closingBalance = totalReceipts - totalPayments;

  const handleExportCSV = () => {
    if (vouchers.length === 0) return;
    const headers = ['Date', 'Voucher #', 'Party', 'Description', 'Cost Center', 'Receipts (BDT)', 'Payments (BDT)'];
    const rows = vouchers.map(v => [
      v.voucher_date,
      v.voucher_number || '',
      `"${(v.party_name || '').replace(/"/g, '""')}"`,
      `"${(v.description || '').replace(/"/g, '""')}"`,
      v.cost_center || '',
      v.voucher_type === 'receipt' ? v.amount : '',
      v.voucher_type === 'payment' ? v.amount : ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CashBook_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <input type="month" className="input-field w-44 shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        <button onClick={handleExportCSV} className="btn-outline flex items-center gap-2 shadow-sm hover:shadow-md transition-all"><Download size={15} /> Export CSV</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 border-l-4 border-success-400">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-success-50 rounded-lg">
              <TrendingUp size={18} className="text-success-600" />
            </div>
            <span className="text-sm font-medium text-neutral-600">Total Receipts</span>
          </div>
          <div className="text-2xl font-bold text-success-600">{formatBDT(totalReceipts)}</div>
        </div>
        <div className="card p-5 border-l-4 border-error-400">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-error-50 rounded-lg">
              <TrendingDown size={18} className="text-error-500" />
            </div>
            <span className="text-sm font-medium text-neutral-600">Total Payments</span>
          </div>
          <div className="text-2xl font-bold text-error-500">{formatBDT(totalPayments)}</div>
        </div>
        <div className={`card p-5 border-l-4 ${closingBalance >= 0 ? 'border-primary-400' : 'border-warning-400'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${closingBalance >= 0 ? 'bg-primary-50' : 'bg-warning-50'}`}>
              <DollarSign size={18} className={closingBalance >= 0 ? 'text-primary-600' : 'text-warning-600'} />
            </div>
            <span className="text-sm font-medium text-neutral-600">Closing Balance</span>
          </div>
          <div className={`text-2xl font-bold ${closingBalance >= 0 ? 'text-primary-600' : 'text-warning-600'}`}>
            {formatBDT(closingBalance)}
          </div>
        </div>
      </div>

      {/* Cash Book Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-heading font-semibold text-neutral-700">Cash Transactions</h3>
          <span className="text-sm text-neutral-400">{vouchers.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Voucher #</th>
                <th className="table-header text-left">Party</th>
                <th className="table-header text-left">Description</th>
                <th className="table-header text-left">Cost Center</th>
                <th className="table-header text-right">Receipts (Dr)</th>
                <th className="table-header text-right">Payments (Cr)</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && vouchers.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400 text-sm">
                  No cash transactions for this period
                </td></tr>
              )}
              {vouchers.map(v => (
                <tr key={v.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell text-sm">{formatDate(v.voucher_date)}</td>
                  <td className="table-cell font-mono text-xs text-primary-600">{v.voucher_number}</td>
                  <td className="table-cell text-sm">{v.party_name || '—'}</td>
                  <td className="table-cell text-sm text-neutral-600 max-w-xs truncate">{v.description}</td>
                  <td className="table-cell text-xs capitalize">{v.cost_center}</td>
                  <td className="table-cell text-right font-semibold text-success-600">
                    {v.voucher_type === 'receipt' ? formatBDT(v.amount) : '—'}
                  </td>
                  <td className="table-cell text-right font-semibold text-error-600">
                    {v.voucher_type === 'payment' ? formatBDT(v.amount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            {vouchers.length > 0 && (
              <tfoot>
                <tr className="bg-neutral-50 font-semibold">
                  <td colSpan={5} className="table-cell text-right text-neutral-600">Total:</td>
                  <td className="table-cell text-right text-success-600 font-bold">{formatBDT(totalReceipts)}</td>
                  <td className="table-cell text-right text-error-600 font-bold">{formatBDT(totalPayments)}</td>
                </tr>
                <tr className="bg-primary-50">
                  <td colSpan={5} className="table-cell text-right font-bold text-neutral-700">Closing Balance:</td>
                  <td colSpan={2} className={`table-cell text-right font-bold text-lg ${closingBalance >= 0 ? 'text-primary-600' : 'text-error-600'}`}>
                    {formatBDT(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
