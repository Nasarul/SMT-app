import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PieChart, BarChart3, Download, Calendar, Filter, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueByCostCenter: Record<string, number>;
  expenseByCostCenter: Record<string, number>;
}

export function FinancialReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'pl' | 'balance_sheet' | 'ait' | 'audit'>('pl');
  const [dateRange, setDateRange] = useState('this_month');
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    revenueByCostCenter: {},
    expenseByCostCenter: {}
  });
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('accounts_vouchers')
        .select('*')
        .eq('is_posted', true)
        .order('voucher_date', { ascending: false });

      setVouchers(data || []);

      const s: FinancialSummary = {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        revenueByCostCenter: {},
        expenseByCostCenter: {}
      };

      data?.forEach(v => {
        const amount = Number(v.amount);
        if (v.voucher_type === 'receipt') {
          s.totalRevenue += amount;
          s.revenueByCostCenter[v.cost_center] = (s.revenueByCostCenter[v.cost_center] || 0) + amount;
        } else if (v.voucher_type === 'payment') {
          s.totalExpenses += amount;
          s.expenseByCostCenter[v.cost_center] = (s.expenseByCostCenter[v.cost_center] || 0) + amount;
        }
      });

      s.netProfit = s.totalRevenue - s.totalExpenses;
      setSummary(s);
    } catch (err) {
      console.error('Error loading financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Financial Reports</h2>
          <p className="text-sm text-neutral-500">Comprehensive view of business performance</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline flex items-center gap-2">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="flex bg-neutral-100 p-1 rounded-xl w-fit mb-6 overflow-x-auto max-w-full">
        <button 
          onClick={() => setReportType('pl')}
          className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${reportType === 'pl' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Profit & Loss
        </button>
        <button 
          onClick={() => setReportType('balance_sheet')}
          className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${reportType === 'balance_sheet' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Balance Sheet
        </button>
        <button 
          onClick={() => setReportType('ait')}
          className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${reportType === 'ait' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          AIT Report
        </button>
        <button 
          onClick={() => setReportType('audit')}
          className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${reportType === 'audit' ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
        >
          Audit Log
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-success-500 to-success-600 text-white">
          <div className="flex items-center justify-between opacity-80 mb-1 text-xs font-semibold uppercase tracking-wider">
            Total Revenue
            <TrendingUp size={16} />
          </div>
          <div className="text-2xl font-bold">{formatBDT(summary.totalRevenue)}</div>
          <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
            Real-time data from vouchers
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-error-500 to-error-600 text-white">
          <div className="flex items-center justify-between opacity-80 mb-1 text-xs font-semibold uppercase tracking-wider">
            Total Expenses
            <TrendingDown size={16} />
          </div>
          <div className="text-2xl font-bold">{formatBDT(summary.totalExpenses)}</div>
          <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
            Total operational costs
          </div>
        </div>
        <div className="card p-5 bg-gradient-to-br from-primary-600 to-secondary-800 text-white">
          <div className="flex items-center justify-between opacity-80 mb-1 text-xs font-semibold uppercase tracking-wider">
            Net Profit
            <PieChart size={16} />
          </div>
          <div className="text-2xl font-bold">{formatBDT(summary.netProfit)}</div>
          <div className="mt-2 text-xs opacity-80 flex items-center gap-1">
            Margin: {summary.totalRevenue ? ((summary.netProfit / summary.totalRevenue) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {reportType === 'pl' || reportType === 'balance_sheet' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Detailed Breakdown */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-neutral-800 mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-500" /> 
              {reportType === 'pl' ? 'Profit & Loss Statement' : 'Balance Sheet Details'}
            </h3>
            
            <div className="space-y-6">
              {/* Revenue Section */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
                  <span>Revenue / Income</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(summary.revenueByCostCenter).map(([center, amount]) => (
                    <div key={center} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                      <div className="text-sm text-neutral-700 capitalize">{center} Sales</div>
                      <div className="text-sm font-semibold text-neutral-800">{formatBDT(amount)}</div>
                    </div>
                  ))}
                  {Object.keys(summary.revenueByCostCenter).length === 0 && (
                    <div className="text-center py-4 text-neutral-400 text-sm">No revenue recorded</div>
                  )}
                  <div className="flex items-center justify-between py-3 bg-neutral-50 px-3 rounded-lg mt-2">
                    <div className="text-sm font-bold text-neutral-800">Total Income</div>
                    <div className="text-sm font-bold text-success-600">{formatBDT(summary.totalRevenue)}</div>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">
                  <span>Operating Expenses</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(summary.expenseByCostCenter).map(([center, amount]) => (
                    <div key={center} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                      <div className="text-sm text-neutral-700 capitalize">{center} Expenses</div>
                      <div className="text-sm font-semibold text-neutral-800">{formatBDT(amount)}</div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3 bg-neutral-50 px-3 rounded-lg mt-2">
                    <div className="text-sm font-bold text-neutral-800">Total Expenses</div>
                    <div className="text-sm font-bold text-error-600">({formatBDT(summary.totalExpenses)})</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-neutral-100 flex items-center justify-between">
                <div className="text-lg font-bold text-neutral-800">Net Business Profit</div>
                <div className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                  {formatBDT(summary.netProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Assets & Cashflow */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="font-heading font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                <Wallet size={18} className="text-secondary-500" /> Current Liquidity
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="text-xs text-neutral-400 uppercase font-bold mb-1">Estimated Cash Flow</div>
                  <div className="text-xl font-bold text-neutral-800">{formatBDT(summary.totalRevenue - summary.totalExpenses)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : reportType === 'ait' ? (
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-neutral-800 mb-4">AIT (Advance Income Tax) Tracking</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Date</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Description</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Cost Center</th>
                  <th className="text-right py-3 text-xs font-bold text-neutral-400 uppercase">AIT Amount</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.filter(v => v.description.toLowerCase().includes('ait')).map(v => (
                  <tr key={v.id} className="border-b border-neutral-50">
                    <td className="py-3 text-sm">{v.voucher_date}</td>
                    <td className="py-3 text-sm">{v.description}</td>
                    <td className="py-3 text-sm capitalize">{v.cost_center}</td>
                    <td className="py-3 text-sm text-right font-semibold">{formatBDT(v.amount)}</td>
                  </tr>
                ))}
                {vouchers.filter(v => v.description.toLowerCase().includes('ait')).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-400 text-sm italic">
                      No specific AIT entries found. Ensure "AIT" is mentioned in voucher descriptions for tracking.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-neutral-800 mb-4">Audit Log — Financial Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Voucher #</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Date</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Type</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Cost Center</th>
                  <th className="text-left py-3 text-xs font-bold text-neutral-400 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-bold text-neutral-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map(v => (
                  <tr key={v.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                    <td className="py-3 font-mono text-primary-600 text-xs">{v.voucher_number}</td>
                    <td className="py-3">{v.voucher_date}</td>
                    <td className="py-3">
                      <Badge variant={v.voucher_type === 'receipt' ? 'success' : 'error' as any}>
                        {v.voucher_type}
                      </Badge>
                    </td>
                    <td className="py-3 capitalize">{v.cost_center}</td>
                    <td className="py-3 text-neutral-600 truncate max-w-[200px]">{v.description}</td>
                    <td className="py-3 text-right font-semibold">{formatBDT(v.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
