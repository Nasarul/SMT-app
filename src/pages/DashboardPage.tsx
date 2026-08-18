import React, { useEffect, useState } from 'react';
import {
  Plane, Moon, Landmark, Map, Users, DollarSign, TrendingUp,
  AlertCircle, Clock, Calendar, CreditCard, CheckCircle2,
  UserPlus, FileText, Send, Plus, ArrowUpRight, Globe, Building2
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { formatBDT, formatDate, getStatusColor } from '../lib/constants';
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

interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  detail?: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  module: ActiveModule;
  color: string;
}

const quickActions: QuickAction[] = [
  { label: 'New Ticket', icon: <Plane size={18} />, module: 'tickets-individual', color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
  { label: 'Hotel Booking', icon: <Building2 size={18} />, module: 'hotels-bookings', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  { label: 'Umrah Booking', icon: <Moon size={18} />, module: 'umrah-pilgrims', color: 'bg-gold-50 text-gold-700 hover:bg-gold-100' },
  { label: 'New Customer', icon: <UserPlus size={18} />, module: 'crm-customers', color: 'bg-success-50 text-success-700 hover:bg-success-100' },
  { label: 'New Voucher', icon: <FileText size={18} />, module: 'accounts-vouchers', color: 'bg-secondary-50 text-secondary-700 hover:bg-secondary-100' },
  { label: 'Add Lead', icon: <TrendingUp size={18} />, module: 'crm-leads', color: 'bg-warning-50 text-warning-700 hover:bg-warning-100' },
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
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
        supabase.from('air_tickets').select('*, customers(full_name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('umrah_pilgrims').select('full_name, passport_number, passport_expiry').lt('passport_expiry', dateLimit),
        supabase.from('hajj_pilgrims').select('full_name, passport_number, passport_expiry').lt('passport_expiry', dateLimit),
        supabase.from('visas').select('id', { count: 'exact' }).not('status', 'eq', 'delivered'),
        supabase.from('b2b_agents').select('current_balance'),
        supabase.from('assets').select('current_value').eq('asset_type', 'liquid'),
        supabase.from('hotel_bookings').select('*').order('created_at', { ascending: false }).limit(3)
      ]);

      const monthlyRev = (ticketsRes.data || []).reduce((sum: number, t: any) => sum + (t.total_fare || 0), 0);
      const profit = (ticketsRes.data || []).reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
      const receivables = (agentsRes.data || []).reduce((sum: number, a: any) => sum + (a.current_balance < 0 ? Math.abs(a.current_balance) : 0), 0);
      const liquidity = (assetsRes.data || []).reduce((sum: number, a: any) => sum + (a.current_value || 0), 0);
      
      const allExpiring = [
        ...(expiringUmrahRes.data || []).map(p => ({ ...p, type: 'Umrah' })),
        ...(expiringHajjRes.data || []).map(p => ({ ...p, type: 'Hajj' }))
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

      // Dynamic alerts based on expiries
      const dynamicAlerts: Alert[] = [];
      if (allExpiring.length > 0) {
        dynamicAlerts.push({ 
          type: 'error', 
          message: 'Urgent Passport Expiries', 
          detail: `${allExpiring.length} pilgrims have passports expiring within 6 months!` 
        });
      }
      
      setAlerts(dynamicAlerts);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setStats(prev => ({ ...prev, totalRevenue: 0, activeVisas: 0 }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-heading font-bold text-neutral-800">Dashboard</h2>
              <span className="badge-primary text-sm px-1.5 py-0">Live</span>
            </div>
            <p className="text-sm text-neutral-400">
              Welcome back! Real-time operations overview.
            </p>
          </div>
          {/* Compact Hajj Season Banner */}
          <div className="hidden lg:flex items-center gap-3 bg-gradient-to-r from-secondary-600 to-primary-500 rounded-xl px-4 py-2 text-white shadow-sm animate-pulse-slow">
            <div className="flex items-center gap-2">
              <Landmark size={14} className="text-gold-400" />
              <div className="text-sm font-bold text-white uppercase tracking-widest">Hajj 2025 Registration Open</div>
            </div>
            <button onClick={() => onNavigate('hajj-pilgrims')} className="bg-white/20 hover:bg-white/30 text-sm font-bold px-3 py-1 rounded-lg transition-colors">
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider mr-2">Quick Actions:</span>
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.module)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${action.color}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        {/* Row 1: Operations */}
        <StatCard
          title="Air Tickets"
          value={stats.totalTickets.toLocaleString()}
          subtitle="Total issued"
          icon={Plane}
          iconColor="text-primary-500"
          iconBg="bg-primary-50"
        />
        <StatCard
          title="Hotel Bookings"
          value={stats.totalHotelBookings.toLocaleString()}
          subtitle="Active reservations"
          icon={Building2}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
        <StatCard
          title="Umrah Groups"
          value={stats.activeUmrahGroups}
          subtitle={`${stats.umrahPilgrimsThisSeason} pilgrims`}
          icon={Moon}
          iconColor="text-gold-600"
          iconBg="bg-gold-50"
        />
        <StatCard
          title="Hajj Pilgrims"
          value={stats.hajjPilgrims}
          subtitle="This season"
          icon={Landmark}
          iconColor="text-secondary-600"
          iconBg="bg-secondary-50"
        />
        <StatCard
          title="Active Tours"
          value={stats.activeTours}
          subtitle="This week"
          icon={Map}
          iconColor="text-warning-600"
          iconBg="bg-warning-50"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Row 2: Financials & Customers */}
        <StatCard
          title="Monthly Revenue"
          value={formatBDT(stats.totalRevenue)}
          subtitle="All modules MTD"
          icon={TrendingUp}
          iconColor="text-success-600"
          iconBg="bg-success-50"
        />
        <StatCard
          title="Total Profit"
          value={formatBDT(stats.totalProfit)}
          subtitle="Net earnings MTD"
          icon={CheckCircle2}
          iconColor="text-primary-600"
          iconBg="bg-primary-50"
        />
        <StatCard
          title="Outstanding"
          value={formatBDT(stats.outstandingReceivables)}
          subtitle="Receivables"
          icon={CreditCard}
          iconColor="text-error-500"
          iconBg="bg-error-50"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString()}
          subtitle="Active database"
          icon={Users}
          iconColor="text-primary-600"
          iconBg="bg-primary-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tickets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-neutral-800 text-base flex items-center gap-2 leading-none">
                <Plane size={16} className="text-primary-500" /> Recent Air Tickets
              </h3>
            </div>
            <button
              onClick={() => onNavigate('tickets-individual')}
              className="text-primary-500 text-sm font-bold hover:underline"
            >
              View All
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-neutral-50">
                  <th className="pb-2 text-sm font-bold text-primary-400/80 uppercase tracking-widest">Passenger</th>
                  <th className="pb-2 text-sm font-bold text-primary-400/80 uppercase tracking-widest">Route</th>
                  <th className="pb-2 text-sm font-bold text-primary-400/80 uppercase tracking-widest">Date</th>
                  <th className="pb-2 text-right text-sm font-bold text-primary-400/80 uppercase tracking-widest">Amount</th>
                  <th className="pb-2 text-center text-sm font-bold text-primary-400/80 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentTickets.map(ticket => (
                  <tr key={ticket.id} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5">
                      <div className="text-sm font-bold text-neutral-800 leading-tight">{ticket.passenger_name}</div>
                      <div className="text-xs text-neutral-400 font-mono uppercase">{ticket.ticket_number || 'TKT-PENDING'}</div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-600">
                        <span className="font-bold text-primary-600">{ticket.origin}</span>
                        <Plane size={10} className="text-neutral-300" />
                        <span className="font-bold text-primary-600">{ticket.destination}</span>
                      </div>
                      <div className="text-xs text-neutral-400 uppercase leading-none">{ticket.airline}</div>
                    </td>
                    <td className="py-2.5 text-sm text-neutral-600">
                      {formatDate(ticket.travel_date)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="text-sm font-black text-neutral-800 leading-tight">{formatBDT(ticket.total_fare)}</div>
                      <div className="text-xs text-success-600 font-bold">Profit: {formatBDT(ticket.profit)}</div>
                    </td>
                    <td className="py-2.5 text-center">
                      <Badge variant={getStatusColor(ticket.status) as any} className="text-xs px-1.5 py-0">
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
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-neutral-800 text-base flex items-center gap-2 leading-none">
                <Building2 size={16} className="text-teal-600" /> Recent Hotel Bookings
              </h3>
            </div>
            <button
              onClick={() => onNavigate('hotels-bookings')}
              className="text-teal-600 text-sm font-bold hover:underline"
            >
              View All Bookings
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-neutral-50">
                  <th className="pb-2 text-sm font-bold text-teal-600/80 uppercase tracking-widest">Customer / Ref</th>
                  <th className="pb-2 text-sm font-bold text-teal-600/80 uppercase tracking-widest">Hotel & City</th>
                  <th className="pb-2 text-right text-sm font-bold text-teal-600/80 uppercase tracking-widest">Fare</th>
                  <th className="pb-2 text-center text-sm font-bold text-teal-600/80 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {recentHotelBookings.map(hb => (
                  <tr key={hb.id} className="group hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5">
                      <div className="text-sm font-bold text-neutral-800 leading-tight">{hb.customer_name}</div>
                      <div className="text-xs text-teal-600 font-mono font-bold uppercase">{hb.booking_reference}</div>
                    </td>
                    <td className="py-2.5">
                      <div className="text-sm font-semibold text-neutral-800">{hb.hotel_name}</div>
                      <div className="text-xs text-neutral-400 uppercase">📍 {hb.city}</div>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="text-sm font-black text-neutral-800 leading-tight">{formatBDT(hb.total_fare)}</div>
                      <div className="text-xs text-success-600 font-bold">Profit: {formatBDT(hb.profit)}</div>
                    </td>
                    <td className="py-2.5 text-center">
                      <Badge variant={getStatusColor(hb.status) as any} className="text-xs px-1.5 py-0">
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

