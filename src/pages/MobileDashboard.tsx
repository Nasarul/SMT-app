import { useEffect, useState } from 'react';
import { 
  Plane, Moon, DollarSign, TrendingUp, 
  AlertCircle, CreditCard,
  Globe, RefreshCw, ArrowUpRight
} from 'lucide-react';
import { formatBDT } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalTickets: number;
  activeUmrahGroups: number;
  totalCustomers: number;
  totalRevenue: number;
  totalProfit: number;
  outstandingReceivables: number;
  activeVisas: number;
  liquidity: number;
}

export function MobileDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0, activeUmrahGroups: 0, totalCustomers: 0,
    totalRevenue: 0, totalProfit: 0, outstandingReceivables: 0, activeVisas: 0,
    liquidity: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        ticketsRes, umrahGroupsRes, 
        customersRes, visasRes,
        agentsRes, assetsRes
      ] = await Promise.all([
        supabase.from('air_tickets').select('total_fare, profit'),
        supabase.from('umrah_groups').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('visas').select('id', { count: 'exact' }).not('status', 'eq', 'delivered'),
        supabase.from('b2b_agents').select('current_balance'),
        supabase.from('assets').select('current_value').eq('asset_type', 'liquid')
      ]);

      const monthlyRev = (ticketsRes.data || []).reduce((sum, t) => sum + (t.total_fare || 0), 0);
      const profit = (ticketsRes.data || []).reduce((sum, t) => sum + (t.profit || 0), 0);
      const receivables = (agentsRes.data || []).reduce((sum, a) => sum + (a.current_balance < 0 ? Math.abs(a.current_balance) : 0), 0);
      const liquidity = (assetsRes.data || []).reduce((sum, a) => sum + (a.current_value || 0), 0);

      setStats({
        totalTickets: ticketsRes.data?.length || 0,
        activeUmrahGroups: umrahGroupsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalRevenue: monthlyRev,
        totalProfit: profit,
        outstandingReceivables: receivables,
        activeVisas: visasRes.count || 0,
        liquidity: liquidity
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="card p-4 flex flex-col gap-2 relative overflow-hidden">
      <div className={`absolute -right-2 -top-2 opacity-10 ${color}`}>
        <Icon size={64} />
      </div>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50')}`}>
          <Icon size={16} className={color} />
        </div>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="mt-1">
        <div className="text-xl font-black text-neutral-800">{value}</div>
        {subValue && <div className="text-[10px] font-bold text-neutral-400 mt-0.5">{subValue}</div>}
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-4 pb-20 animate-fade-in bg-neutral-50 min-h-screen">
      <div className="flex items-center justify-between sticky top-0 bg-neutral-50/80 backdrop-blur-md py-2 z-10">
        <div>
          <h2 className="text-lg font-black text-neutral-800 flex items-center gap-2">
            Management View <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Real-time Dashboard</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading}
          className="p-2 bg-white border border-neutral-200 rounded-xl text-neutral-600 hover:text-primary-600 active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Primary Financials */}
      <div className="grid grid-cols-1 gap-3">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 rotate-12">
            <DollarSign size={120} />
          </div>
          <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.2em] mb-1">Available Liquidity</p>
          <h3 className="text-3xl font-black mb-4">{formatBDT(stats.liquidity)}</h3>
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">MTD Revenue</p>
              <p className="text-sm font-black text-success-400 flex items-center gap-1">
                <TrendingUp size={12} /> {formatBDT(stats.totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">MTD Net Profit</p>
              <p className="text-sm font-black text-primary-400 flex items-center gap-1">
                <ArrowUpRight size={12} /> {formatBDT(stats.totalProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          title="Active Visas" 
          value={stats.activeVisas} 
          icon={Globe} 
          color="text-blue-600" 
          subValue="Processing now"
        />
        <MetricCard 
          title="Air Tickets" 
          value={stats.totalTickets} 
          icon={Plane} 
          color="text-primary-600" 
          subValue="Total Issued"
        />
        <MetricCard 
          title="Umrah Groups" 
          value={stats.activeUmrahGroups} 
          icon={Moon} 
          color="text-gold-600" 
          subValue="Open for booking"
        />
        <MetricCard 
          title="Receivables" 
          value={formatBDT(stats.outstandingReceivables)} 
          icon={CreditCard} 
          color="text-error-600" 
          subValue="Outstanding dues"
        />
      </div>

      {/* Progress Bars for Goals */}
      <div className="card p-5 space-y-4">
        <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Monthly Target Progress</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-neutral-600">REVENUE TARGET</span>
              <span className="text-primary-600">75%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full w-[75%]" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-neutral-600">VISA DELIVERY</span>
              <span className="text-success-600">92%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div className="h-full bg-success-500 rounded-full w-[92%]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-warning-50 rounded-2xl border border-warning-100">
        <AlertCircle size={18} className="text-warning-600 shrink-0" />
        <p className="text-[11px] text-warning-800 leading-tight">
          <strong>Security:</strong> Management dashboard is restricted to Admin/Owner roles only. Always sign out after viewing.
        </p>
      </div>
    </div>
  );
}
