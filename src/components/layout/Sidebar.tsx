import React, { useState } from 'react';
import {
  LayoutDashboard, Plane, Moon, Landmark, Map, Users, DollarSign, LayoutGrid,
  UserCog, ChevronDown, ChevronRight, LogOut, Menu, X, Building2,
  TrendingUp, Calendar, FileText, Star, Globe, Briefcase, Bell, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

export type ActiveModule =
  | 'dashboard' | 'mobile-dashboard'
  | 'tickets-individual' | 'tickets-b2b' | 'tickets-report' | 'tickets-setup' | 'tickets-suppliers'
  | 'umrah-packages' | 'umrah-groups' | 'umrah-pilgrims'
  | 'hajj-packages' | 'hajj-pilgrims' | 'hajj-logistics'
  | 'tours-domestic' | 'tours-international' | 'tours-bookings'
  | 'hrm-employees' | 'hrm-attendance' | 'hrm-leaves' | 'hrm-payroll'
  | 'accounts-vouchers' | 'accounts-cashbook' | 'accounts-reports' | 'accounts-receivables' | 'accounts-assets' | 'accounts-suppliers-aging'
  | 'crm-customers' | 'crm-leads' | 'crm-b2b' | 'crm-campaigns' | 'crm-visa' | 'crm-quotations'
  | 'audit-logs' | 'notifications' | 'settings' | 'profile';


interface NavItem {
  id: ActiveModule;
  label: string;
  icon?: React.ReactNode;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  roles?: string[];
}

const navGroups: NavGroup[] = [
  {
    id: 'sales-ops',
    label: 'Sales & Operations',
    icon: <Plane size={18} />,
    items: [
      { id: 'tickets-individual', label: 'Air Tickets' },
      { id: 'tickets-b2b', label: 'B2B Group Sales' },
      { id: 'tickets-suppliers', label: 'Ticket Suppliers' },
      { id: 'tickets-report', label: 'Ticket Reports' },
      { id: 'umrah-pilgrims', label: 'Umrah Pilgrims' },
      { id: 'hajj-pilgrims', label: 'Hajj Pilgrims' },
      { id: 'hajj-logistics', label: 'Hajj Logistics' },
      { id: 'tours-bookings', label: 'Tour Bookings' },
    ],
    roles: ['super_admin', 'admin', 'sales_agent', 'tour_manager'],
  },
  {
    id: 'accounts-finance',
    label: 'Finance & Accounts',
    icon: <DollarSign size={18} />,
    items: [
      { id: 'accounts-vouchers', label: 'Voucher Entry' },
      { id: 'accounts-cashbook', label: 'Daily Cash Book' },
      { id: 'accounts-receivables', label: 'Accounts Receivable' },
      { id: 'accounts-suppliers-aging', label: 'Supplier Aging' },
      { id: 'accounts-reports', label: 'Financial Reports' },
      { id: 'accounts-assets', label: 'Assets & Investment' },
    ],
    roles: ['super_admin', 'admin', 'accounts_manager'],
  },
  {
    id: 'crm-marketing',
    label: 'Customer & CRM',
    icon: <Users size={18} />,
    items: [
      { id: 'crm-customers', label: 'Customer Database' },
      { id: 'crm-leads', label: 'Lead Management' },
      { id: 'crm-b2b', label: 'B2B Agent Admin' },
      { id: 'crm-visa', label: 'Visa Processing' },
      { id: 'crm-quotations', label: 'Quotation Generator' },
      { id: 'crm-campaigns', label: 'SMS Campaigns' },
    ],
    roles: ['super_admin', 'admin', 'sales_agent', 'tour_manager'],
  },
  {
    id: 'hr-admin',
    label: 'HR & Administration',
    icon: <UserCog size={18} />,
    items: [
      { id: 'hrm-employees', label: 'Employee Profiles' },
      { id: 'hrm-attendance', label: 'Attendance' },
      { id: 'hrm-leaves', label: 'Leave Management' },
      { id: 'hrm-payroll', label: 'Payroll' },
    ],
    roles: ['super_admin', 'admin', 'hr_manager'],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: <SettingsIcon size={18} />,
    items: [
      { id: 'tickets-setup', label: 'Flight Master Setup' },
      { id: 'audit-logs', label: 'Audit Trail (Logs)' },
    ],
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'my-account',
    label: 'My Account',
    icon: <UserCog size={18} />,
    items: [
      { id: 'profile', label: 'My Profile' },
      { id: 'notifications', label: 'Alerts & Reminders' },
      { id: 'settings', label: 'System Settings', roles: ['super_admin', 'admin'] },
    ],
  },
];



interface SidebarProps {
  active: ActiveModule;
  onNavigate: (mod: ActiveModule) => void;
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { company } = useSettings();
  const [logoError, setLogoError] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'sales-ops': true, 'accounts-finance': false, 'crm-marketing': false, 'hr-admin': false, 'my-account': false,
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const handleNavClick = (mod: ActiveModule) => {
    onNavigate(mod);
    setMobileOpen(false);
  };

  const normalizedRole = profile?.role?.toLowerCase().replace(/ /g, '_') || '';

  const visibleGroups = navGroups.filter(g =>
    !profile || !g.roles || g.roles.includes(normalizedRole) || normalizedRole === 'super_admin'
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div 
        className="p-5 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group"
        onClick={() => handleNavClick('dashboard')}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-300">
            {company.logo_url && !logoError ? (
              <img 
                src={`${company.logo_url}?v=${Date.now()}`} 
                alt="Logo" 
                className="w-full h-full object-contain p-1" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Plane size={18} className="text-white rotate-45" />
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-heading font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors uppercase">{company.name}</div>
            <div className="text-[10px] font-bold text-primary-400/80 uppercase tracking-widest">{company.tagline || 'Management System'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {/* Dashboard Link */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-4 ${
            active === 'dashboard'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
              : 'text-neutral-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        {(normalizedRole === 'super_admin' || normalizedRole === 'admin') && (
          <button
            onClick={() => handleNavClick('mobile-dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-4 ${
              active === 'mobile-dashboard'
                ? 'bg-success-600 text-white shadow-lg shadow-success-500/20'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <TrendingUp size={18} />
            <span>Mobile Dashboard</span>
          </button>
        )}

        {/* Groups */}
        {visibleGroups.map(group => {
          const isOpen = openGroups[group.id];
          const hasActiveItem = group.items.some(item => item.id === active);
          
          // Module specific colors
          const groupColors: Record<string, string> = {
            'sales-ops': 'text-blue-400',
            'accounts-finance': 'text-emerald-400',
            'crm-marketing': 'text-amber-400',
            'hr-admin': 'text-purple-400',
            'administration': 'text-neutral-400',
            'my-account': 'text-rose-400'
          };



          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isOpen || hasActiveItem ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <span className={`${groupColors[group.id] || 'text-primary-400'}`}>{group.icon}</span>
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : '-rotate-90 opacity-40'}`} />
              </button>
              
              {isOpen && (
                <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-2">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                        active === item.id
                          ? 'text-primary-400 bg-primary-400/10 font-bold'
                          : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/5'
                      }`}
                    >
                      {active === item.id && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary-500 rounded-full" />
                      )}
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="mb-3 px-1">
          <div className="text-[11px] font-bold text-white truncate">{profile?.full_name}</div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-neutral-500 hover:bg-error-500/10 hover:text-error-400 transition-all border border-transparent hover:border-error-500/20"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-secondary-800 text-white rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — mobile */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-secondary-800 z-50 transform transition-transform duration-300 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 bg-secondary-800 z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
