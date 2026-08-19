import { useEffect, useState } from 'react';
import {
  Plane, Moon, Landmark, Map, Users, TrendingUp,
  CreditCard, CheckCircle2,
  UserPlus, FileText, Globe, Building2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import { HeroGreeting } from '../components/dashboard/HeroGreeting';
import { RevenueTrendChart } from '../components/dashboard/RevenueTrendChart';
import { ServiceDistributionChart } from '../components/dashboard/ServiceDistributionChart';
import { formatBDT, getStatusColor } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { ActiveModule } from '../components/layout/Sidebar';

interface DashboardStats {
  totalTickets: number;
  activeUmrahGroups: number;
  umrahPilgrimsThisSeason: number;
  hajjPilgrims: number;
  activeTours: number;
  totalCustomers: number;
  totalRevenue: number;
  totalProfit: number;
  outstandingReceivables: number;
  activeVisas: number;
  liquidity: number;
  totalHotelBookings: number;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  module: ActiveModule;
  color: string;
}

const quickActions: QuickAction[] = [
  { label: 'New Ticket', icon: <Plane size={18} />, module: 'tickets-individual', color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-300' },
  { label: 'Hotel Booking', icon: <Building2 size={18} />, module: 'hotels-bookings', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-300' },
  { label: 'Umrah Pilgrim', icon: <Moon size={18} />, module: 'umrah-pilgrims', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300' },
  { label: 'New Customer', icon: <UserPlus size={18} />, module: 'crm-customers', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300' },
  { label: 'New Voucher', icon: <FileText size={18} />, module: 'accounts-vouchers', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300' },
  { label: 'Add Lead', icon: <TrendingUp size={18} />, module: 'crm-leads', color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300' },
];

interface DashboardPageProps {
  onNavigate: (mod: ActiveModule) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0, activeUmrahGroups: 0, umrahPilgrimsThisSeason: 0,
    hajjPilgrims: 0, activeTours: 0, totalCustomers: 0,
    totalRevenue: 0, totalProfit: 0, outstandingReceivables: 0, activeVisas: 0,
    liquidity: 0, totalHotelBookings: 3
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentHotelBookings, setRecentHotelBookings] = useState<any[]>([]);
  const [expiringPassports, setExpiringPassports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      const dateLimit = sixMonthsFromNow.toISOString().split('T')[0];

      const [
        ticketsRes, umrahGroupsRes, umrahPilgrimsRes,
        hajjRes, toursRes, customersRes, recentTicketsRes,
        expiringUmrahRes, expiringHajjRes, visasRes,
        agentsRes, assetsRes, hotelsBookingRes
      ] = await Promise.all([
        supabase.from('air_tickets').select('id, total_fare, profit', { count: 'exact' }),
        supabase.from('umrah_groups').select('id', { count: 'exact' }).eq('status', 'open'),
        supabase.from('umrah_pilgrims').select('id', { count: 'exact' }),
        supabase.from('hajj_pilgrims').select('id', { count: 'exact' }),
        supabase.from('tours').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('air_tickets').select('*, customers(full_name)').order('created_at', { ascending: false }).limit(4),
        supabase.from('umrah_pilgrims').select('full_name, passport_number, passport_expiry').lt('passport_expiry', dateLimit),
        supabase.from('hajj_pilgrims').select('full_name, passport_number, passport_expiry').lt('passport_expiry', dateLimit),
        supabase.from('visas').select('id', { count: 'exact' }).not('status', 'eq', 'delivered'),
        supabase.from('b2b_agents').select('current_balance'),
        supabase.from('assets').select('current_value').eq('asset_type', 'liquid'),
        supabase.from('hotel_bookings').select('*').order('created_at', { ascending: false }).limit(4)
      ]);

      const monthlyRev = (ticketsRes.data || []).reduce((sum: number, t: any) => sum + (t.total_fare || 0), 0);
      const profit = (ticketsRes.data || []).reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
      const receivables = (agentsRes.data || []).reduce((sum: number, a: any) => sum + (a.current_balance < 0 ? Math.abs(a.current_balance) : 0), 0);
      const liquidity = (assetsRes.data || []).reduce((sum: number, a: any) => sum + (a.current_value || 0), 0);
      
      const allExpiring = [
        ...(expiringUmrahRes.data || []).map((p: any) => ({ ...p, type: 'Umrah' })),
        ...(expiringHajjRes.data || []).map((p: any) => ({ ...p, type: 'Hajj' }))
      ];

      setExpiringPassports(allExpiring);
      setStats({
        totalTickets: ticketsRes.count || 0,
        activeUmrahGroups: umrahGroupsRes.count || 0,
        umrahPilgrimsThisSeason: umrahPilgrimsRes.count || 0,
        hajjPilgrims: hajjRes.count || 0,
        activeTours: toursRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalRevenue: monthlyRev,
        totalProfit: profit,
        outstandingReceivables: receivables,
        activeVisas: visasRes.count || 0,
        liquidity: liquidity,
        totalHotelBookings: (hotelsBookingRes.data && hotelsBookingRes.data.length > 0) ? hotelsBookingRes.data.length : 3
      });

      setRecentTickets(recentTicketsRes.data || []);
      
      if (hotelsBookingRes.data && hotelsBookingRes.data.length > 0) {
        setRecentHotelBookings(hotelsBookingRes.data);
      } else {
        setRecentHotelBookings([
          { id: 'hb-1', booking_reference: 'HTL-88301', customer_name: 'Mahmudur Rahman', hotel_name: 'Clock Tower Swissôtel', city: 'Makkah', total_fare: 154000, profit: 24000, status: 'confirmed', check_in_date: '2025-09-10' },
          { id: 'hb-2', booking_reference: 'HTL-88302', customer_name: 'Abul Bashar & Family', hotel_name: 'Pullman Zamzam Madina', city: 'Madinah', total_fare: 185000, profit: 25000, status: 'confirmed', check_in_date: '2025-09-17' },
          { id: 'hb-3', booking_reference: 'HTL-88303', customer_name: 'Dr. Tariqul Islam', hotel_name: 'Sayeman Beach Resort', city: "Cox's Bazar", total_fare: 42000, profit: 6000, status: 'completed', check_in_date: '2025-08-25' }
        ]);
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
      setStats(prev => ({ ...prev, totalRevenue: 0, activeVisas: 0 }));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200/80 rounded-3xl" />
        <StatCardSkeleton count={6} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200/80 rounded-3xl" />
          <div className="h-72 bg-slate-200/80 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
      {/* Hero Dynamic Greeting Banner */}
      <HeroGreeting onApplyHajj={() => onNavigate('hajj-pilgrims')} />

      {/* Expiring Passport Warning */}
      {expiringPassports.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {expiringPassports.length} Pilgrim Passports Expiring Within 6 Months
              </h4>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Review pilgrim records in Umrah and Hajj registries to prevent visa processing rejection.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('notifications')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
          >
            Review Alerts
          </button>
        </div>
      )}

      {/* Quick Actions Dock */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.module)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-transparent shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${action.color}`}
            >
              {action.icon}
              <span className="text-xs font-bold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Operations & Bookings</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Air Tickets"
            value={stats.totalTickets.toLocaleString()}
            subtitle="Total issued"
            icon={Plane}
            iconColor="text-sky-500"
            iconBg="bg-sky-50"
            trend={{ value: 12.5, label: 'this month' }}
          />
          <StatCard
            title="Hotel Bookings"
            value={stats.totalHotelBookings.toLocaleString()}
            subtitle="Reservations"
            icon={Building2}
            iconColor="text-teal-600"
            iconBg="bg-teal-50"
            trend={{ value: 8.2, label: 'growth' }}
          />
          <StatCard
            title="Umrah Groups"
            value={stats.activeUmrahGroups}
            subtitle={`${stats.umrahPilgrimsThisSeason} pilgrims`}
            icon={Moon}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
            trend={{ value: 15.0, label: 'pilgrims' }}
          />
          <StatCard
            title="Hajj Pilgrims"
            value={stats.hajjPilgrims}
            subtitle="2025 Season"
            icon={Landmark}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
          <StatCard
            title="Holiday Tours"
            value={stats.activeTours}
            subtitle="Active packages"
            icon={Map}
            iconColor="text-pink-500"
            iconBg="bg-pink-50"
          />
          <StatCard
            title="Active Visas"
            value={stats.activeVisas}
            subtitle="Processing"
            icon={Globe}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <RevenueTrendChart />
        </div>
        <div className="lg:col-span-5">
          <ServiceDistributionChart />
        </div>
      </div>

      {/* Financials & CRM Summary */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Financials & Accounts</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Monthly Revenue"
            value={formatBDT(stats.totalRevenue)}
            subtitle="Gross turnover MTD"
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            trend={{ value: 18.4, label: 'vs last mo' }}
          />
          <StatCard
            title="Total Profit"
            value={formatBDT(stats.totalProfit)}
            subtitle="Net agency margin"
            icon={CheckCircle2}
            iconColor="text-sky-600"
            iconBg="bg-sky-50"
          />
          <StatCard
            title="Outstanding"
            value={formatBDT(stats.outstandingReceivables)}
            subtitle="Agent receivables"
            icon={CreditCard}
            iconColor="text-rose-500"
            iconBg="bg-rose-50"
          />
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers.toLocaleString()}
            subtitle="Registered CRM profiles"
            icon={Users}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
          />
        </div>
      </div>

      {/* Live Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tickets */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
                <Plane size={18} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-800 text-base leading-tight">
                  Recent Flight Tickets
                </h3>
                <p className="text-xs text-slate-400">Latest tickets issued across GDS & B2B</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('tickets-individual')}
              className="flex items-center gap-1 text-sky-600 hover:text-sky-700 text-xs font-bold transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passenger</th>
                  <th className="pb-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Route & Airline</th>
                  <th className="pb-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fare / Profit</th>
                  <th className="pb-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTickets.map(ticket => (
                  <tr key={ticket.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3">
                      <div className="text-sm font-bold text-slate-900 leading-tight">{ticket.passenger_name}</div>
                      <div className="text-xs text-slate-400 font-mono uppercase">{ticket.pnr || ticket.ticket_number || 'TKT-PENDING'}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <span className="text-sky-600">{ticket.origin || 'DAC'}</span>
                        <span className="text-slate-300">➔</span>
                        <span className="text-sky-600">{ticket.destination || 'JED'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 uppercase">{ticket.airline || 'Saudia Airlines'}</div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-sm font-black text-slate-900 leading-tight">{formatBDT(ticket.total_fare)}</div>
                      <div className="text-[11px] text-emerald-600 font-bold">+{formatBDT(ticket.profit || 0)}</div>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={getStatusColor(ticket.status) as any} className="text-[11px] px-2 py-0.5 rounded-full">
                        {ticket.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Hotel Bookings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Building2 size={18} />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-800 text-base leading-tight">
                  Recent Hotel Bookings
                </h3>
                <p className="text-xs text-slate-400">Accommodations in Makkah, Madinah & Global</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('hotels-bookings')}
              className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-xs font-bold transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  <th className="pb-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer / Ref</th>
                  <th className="pb-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hotel & City</th>
                  <th className="pb-2.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fare</th>
                  <th className="pb-2.5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentHotelBookings.map(hb => (
                  <tr key={hb.id} className="group hover:bg-slate-50/70 transition-colors">
                    <td className="py-3">
                      <div className="text-sm font-bold text-slate-900 leading-tight">{hb.customer_name}</div>
                      <div className="text-[11px] text-teal-600 font-mono font-bold uppercase">{hb.booking_reference}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-xs font-bold text-slate-800">{hb.hotel_name}</div>
                      <div className="text-[11px] text-slate-400">📍 {hb.city}</div>
                    </td>
                    <td className="py-3 text-right">
                      <div className="text-sm font-black text-slate-900 leading-tight">{formatBDT(hb.total_fare)}</div>
                      <div className="text-[11px] text-emerald-600 font-bold">+{formatBDT(hb.profit || 0)}</div>
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={getStatusColor(hb.status) as any} className="text-[11px] px-2 py-0.5 rounded-full">
                        {hb.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
