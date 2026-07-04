import React, { useState, useEffect } from 'react';
import { Download, Search, Filter, Calendar, AlertTriangle, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT, formatDate } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';

interface AgingItem {
  supplier_id: string;
  supplier_name: string;
  total_due: number;
  current: number; // 0-30 days
  thirty_to_sixty: number; // 31-60 days
  sixty_to_ninety: number; // 61-90 days
  over_ninety: number; // 90+ days
  last_payment_date?: string;
}

export function SupplierAgingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgingItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAgingReport();
  }, []);

  const loadAgingReport = async () => {
    setLoading(true);
    try {
      // 1. Fetch all suppliers
      const { data: suppliers } = await supabase.from('suppliers').select('id, company_name');
      
      // 2. Fetch all individual air tickets (which are usually purchased from suppliers)
      // Note: In a full system, this would also include other purchases/expenses
      const { data: tickets } = await supabase.from('air_tickets').select('supplier_id, cost_fare, created_at, status').not('supplier_id', 'is', null);
      
      // 3. Fetch all payments made to suppliers from vouchers
      const { data: payments } = await supabase.from('accounts_vouchers')
        .select('party_name, amount, voucher_date')
        .eq('voucher_type', 'payment')
        .eq('cost_center', 'ticket'); // Assuming supplier payments are marked under tickets or specific cost centers

      const agingReport: AgingItem[] = [];
      const now = new Date();

      suppliers?.forEach(supplier => {
        const supplierTickets = tickets?.filter(t => t.supplier_id === supplier.id) || [];
        
        // This is a simplified calculation for the aging demo
        // In production, we'd match payments to specific invoices
        let totalPurchased = supplierTickets.reduce((sum, t) => sum + Number(t.cost_fare), 0);
        
        // Estimate payments by party name (imperfect but works for demo)
        const supplierPayments = payments?.filter(p => p.party_name?.toLowerCase().includes(supplier.company_name.toLowerCase())) || [];
        const totalPaid = supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        let remainingBalance = totalPurchased - totalPaid;

        if (remainingBalance > 0) {
          const aging: AgingItem = {
            supplier_id: supplier.id,
            supplier_name: supplier.company_name,
            total_due: remainingBalance,
            current: 0,
            thirty_to_sixty: 0,
            sixty_to_ninety: 0,
            over_ninety: 0,
            last_payment_date: supplierPayments.length > 0 ? supplierPayments[0].voucher_date : undefined
          };

          // Distribute balance based on ticket dates (oldest first)
          let balanceToDistribute = remainingBalance;
          const sortedTickets = [...supplierTickets].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          sortedTickets.forEach(ticket => {
            if (balanceToDistribute <= 0) return;
            
            const ticketDate = new Date(ticket.created_at);
            const diffDays = Math.floor((now.getTime() - ticketDate.getTime()) / (1000 * 3600 * 24));
            const amount = Math.min(balanceToDistribute, Number(ticket.cost_fare));

            if (diffDays <= 30) aging.current += amount;
            else if (diffDays <= 60) aging.thirty_to_sixty += amount;
            else if (diffDays <= 90) aging.sixty_to_ninety += amount;
            else aging.over_ninety += amount;

            balanceToDistribute -= amount;
          });

          agingReport.push(aging);
        }
      });

      setData(agingReport.sort((a, b) => b.total_due - a.total_due));
    } catch (err) {
      console.error('Error generating aging report:', err);
    } finally {
      setLoading(false);
    }
  };

  const totals = data.reduce((acc, item) => ({
    total: acc.total + item.total_due,
    current: acc.current + item.current,
    p30: acc.p30 + item.thirty_to_sixty,
    p60: acc.p60 + item.sixty_to_ninety,
    p90: acc.p90 + item.over_ninety,
  }), { total: 0, current: 0, p30: 0, p60: 0, p90: 0 });

  const filtered = data.filter(item => 
    item.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Supplier Aging Report</h2>
          <p className="text-sm text-neutral-500">Track outstanding payables and credit periods for suppliers</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-2">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 border-l-4 border-primary-500">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Total Payable</div>
          <div className="text-lg font-black text-neutral-800">{formatBDT(totals.total)}</div>
        </div>
        <div className="card p-4 border-l-4 border-success-500">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Current (0-30)</div>
          <div className="text-lg font-black text-neutral-800">{formatBDT(totals.current)}</div>
        </div>
        <div className="card p-4 border-l-4 border-warning-500">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">31 - 60 Days</div>
          <div className="text-lg font-black text-neutral-800">{formatBDT(totals.p30)}</div>
        </div>
        <div className="card p-4 border-l-4 border-orange-500">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">61 - 90 Days</div>
          <div className="text-lg font-black text-neutral-800">{formatBDT(totals.p60)}</div>
        </div>
        <div className="card p-4 border-l-4 border-error-500">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Over 90 Days</div>
          <div className="text-lg font-black text-neutral-800">{formatBDT(totals.p90)}</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card p-4 mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by supplier name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={loadAgingReport} className="btn-ghost flex items-center gap-2">
          <Filter size={15} /> Refresh
        </button>
      </div>

      {/* Aging Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="table-header text-left">Supplier Name</th>
                <th className="table-header text-right">Current</th>
                <th className="table-header text-right">31-60 Days</th>
                <th className="table-header text-right">61-90 Days</th>
                <th className="table-header text-right">90+ Days</th>
                <th className="table-header text-right">Total Balance</th>
                <th className="table-header text-center">Last Payment</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400">Calculating aging report...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400 italic">No outstanding supplier balances found.</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.supplier_id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors group">
                    <td className="table-cell font-bold text-neutral-800">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-primary-500" />
                        {item.supplier_name}
                      </div>
                    </td>
                    <td className="table-cell text-right text-sm font-medium text-neutral-600">
                      {item.current > 0 ? formatBDT(item.current) : '—'}
                    </td>
                    <td className="table-cell text-right text-sm font-medium text-warning-600">
                      {item.thirty_to_sixty > 0 ? formatBDT(item.thirty_to_sixty) : '—'}
                    </td>
                    <td className="table-cell text-right text-sm font-medium text-orange-600">
                      {item.sixty_to_ninety > 0 ? formatBDT(item.sixty_to_ninety) : '—'}
                    </td>
                    <td className="table-cell text-right text-sm font-bold text-error-600">
                      {item.over_ninety > 0 ? formatBDT(item.over_ninety) : '—'}
                    </td>
                    <td className="table-cell text-right">
                      <div className="text-sm font-black text-neutral-900 bg-neutral-100 px-3 py-1 rounded-lg inline-block">
                        {formatBDT(item.total_due)}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="text-xs text-neutral-500">
                        {item.last_payment_date ? formatDate(item.last_payment_date) : 'No record'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot className="bg-neutral-900 text-white">
                <tr>
                  <td className="py-4 px-6 text-xs font-black uppercase tracking-widest">Total Payables</td>
                  <td className="py-4 px-4 text-right text-sm font-bold">{formatBDT(totals.current)}</td>
                  <td className="py-4 px-4 text-right text-sm font-bold text-warning-400">{formatBDT(totals.p30)}</td>
                  <td className="py-4 px-4 text-right text-sm font-bold text-orange-400">{formatBDT(totals.p60)}</td>
                  <td className="py-4 px-4 text-right text-sm font-bold text-error-400">{formatBDT(totals.p90)}</td>
                  <td className="py-4 px-6 text-right text-lg font-black text-primary-400">{formatBDT(totals.total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-start gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
        <AlertTriangle size={18} className="text-primary-600 mt-0.5" />
        <div className="text-xs text-primary-800 leading-relaxed">
          <strong>Note:</strong> This report is generated by matching total ticket costs against payments made to each supplier. For precise reconciliation, ensure all supplier payments are recorded in the <strong>Voucher Entry</strong> module with the correct party name and cost center.
        </div>
      </div>
    </div>
  );
}
