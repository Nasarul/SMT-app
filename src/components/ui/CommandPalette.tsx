import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Plane, Moon, Building2, Users, DollarSign,
  UserCog, Settings, Bell, FileText, ArrowRight,
  TrendingUp, Compass, Globe
} from 'lucide-react';
import { ActiveModule } from '../layout/Sidebar';
import { supabase } from '../../lib/supabase';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: ActiveModule) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Quick Actions' | 'Live Records';
  icon: React.ReactNode;
  module?: ActiveModule;
  action?: () => void;
  shortcut?: string;
  subtitle?: string;
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveResults, setLiveResults] = useState<CommandItem[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
      setLiveResults([]);
    }
  }, [isOpen]);

  // Static navigation list
  const staticItems: CommandItem[] = useMemo(
    () => [
      // Quick Actions
      {
        id: 'action-ticket',
        title: 'New Air Ticket Booking',
        category: 'Quick Actions',
        icon: <Plane className="w-4 h-4 text-sky-500" />,
        module: 'tickets-individual',
        subtitle: 'Issue or book new flight ticket',
      },
      {
        id: 'action-customer',
        title: 'Create New Customer / Lead',
        category: 'Quick Actions',
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        module: 'crm-customers',
        subtitle: 'Register new client profile',
      },
      {
        id: 'action-umrah',
        title: 'Register Umrah Pilgrim',
        category: 'Quick Actions',
        icon: <Moon className="w-4 h-4 text-amber-500" />,
        module: 'umrah-pilgrims',
        subtitle: 'Add pilgrim to open Umrah package',
      },
      {
        id: 'action-voucher',
        title: 'Create Accounts Voucher',
        category: 'Quick Actions',
        icon: <DollarSign className="w-4 h-4 text-purple-500" />,
        module: 'accounts-vouchers',
        subtitle: 'Debit/Credit payment voucher',
      },

      // Navigation
      { id: 'nav-dash', title: 'Dashboard & Overview', category: 'Navigation', icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, module: 'dashboard' },
      { id: 'nav-tickets', title: 'Air Tickets (Individual & Group)', category: 'Navigation', icon: <Plane className="w-4 h-4 text-sky-500" />, module: 'tickets-individual' },
      { id: 'nav-b2b', title: 'B2B Agent Portal', category: 'Navigation', icon: <Globe className="w-4 h-4 text-blue-500" />, module: 'crm-b2b' },
      { id: 'nav-hotels', title: 'Hotel Directory & Bookings', category: 'Navigation', icon: <Building2 className="w-4 h-4 text-teal-500" />, module: 'hotels-directory' },
      { id: 'nav-umrah-p', title: 'Umrah Pilgrims & Packages', category: 'Navigation', icon: <Moon className="w-4 h-4 text-amber-500" />, module: 'umrah-pilgrims' },
      { id: 'nav-hajj', title: 'Hajj Management & Logistics', category: 'Navigation', icon: <Compass className="w-4 h-4 text-yellow-600" />, module: 'hajj-pilgrims' },
      { id: 'nav-tours', title: 'Holiday Tours (Domestic & Intl)', category: 'Navigation', icon: <Globe className="w-4 h-4 text-orange-500" />, module: 'tours-bookings' },
      { id: 'nav-customers', title: 'Customers & CRM Database', category: 'Navigation', icon: <Users className="w-4 h-4 text-emerald-500" />, module: 'crm-customers' },
      { id: 'nav-leads', title: 'Leads & Sales Pipeline', category: 'Navigation', icon: <TrendingUp className="w-4 h-4 text-rose-500" />, module: 'crm-leads' },
      { id: 'nav-cashbook', title: 'Cash Book & Financial Reports', category: 'Navigation', icon: <DollarSign className="w-4 h-4 text-green-600" />, module: 'accounts-cashbook' },
      { id: 'nav-payroll', title: 'HRM Employees & Payroll', category: 'Navigation', icon: <UserCog className="w-4 h-4 text-cyan-600" />, module: 'hrm-employees' },
      { id: 'nav-notif', title: 'Notifications & Alerts', category: 'Navigation', icon: <Bell className="w-4 h-4 text-amber-500" />, module: 'notifications' },
      { id: 'nav-settings', title: 'System & Agency Settings', category: 'Navigation', icon: <Settings className="w-4 h-4 text-slate-500" />, module: 'settings' },
    ],
    []
  );

  // Live query Supabase for customer, ticket or hotel matches
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setLiveResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const searchTerm = `%${query}%`;
        const [custRes, ticketRes, hotelRes] = await Promise.all([
          supabase.from('customers').select('id, full_name, phone, email').or(`full_name.ilike.${searchTerm},phone.ilike.${searchTerm}`).limit(3),
          supabase.from('air_tickets').select('id, passenger_name, pnr, route').or(`passenger_name.ilike.${searchTerm},pnr.ilike.${searchTerm}`).limit(3),
          supabase.from('hotels').select('id, hotel_name, city').or(`hotel_name.ilike.${searchTerm},city.ilike.${searchTerm}`).limit(3),
        ]);

        const results: CommandItem[] = [];

        if (custRes.data) {
          custRes.data.forEach((c: any) => {
            results.push({
              id: `cust-${c.id}`,
              title: c.full_name,
              category: 'Live Records',
              icon: <Users className="w-4 h-4 text-emerald-500" />,
              module: 'crm-customers',
              subtitle: `Customer • ${c.phone || c.email || 'No contact'}`,
            });
          });
        }

        if (ticketRes.data) {
          ticketRes.data.forEach((t: any) => {
            results.push({
              id: `ticket-${t.id}`,
              title: `${t.passenger_name} (${t.pnr})`,
              category: 'Live Records',
              icon: <Plane className="w-4 h-4 text-sky-500" />,
              module: 'tickets-individual',
              subtitle: `Flight Ticket • Route: ${t.route || 'N/A'}`,
            });
          });
        }

        if (hotelRes.data) {
          hotelRes.data.forEach((h: any) => {
            results.push({
              id: `hotel-${h.id}`,
              title: h.hotel_name,
              category: 'Live Records',
              icon: <Building2 className="w-4 h-4 text-teal-500" />,
              module: 'hotels-directory',
              subtitle: `Hotel • ${h.city || 'Directory'}`,
            });
          });
        }

        setLiveResults(results);
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter static items by query
  const filteredStatic = useMemo(() => {
    if (!query.trim()) return staticItems;
    const lower = query.toLowerCase();
    return staticItems.filter(
      (item) => item.title.toLowerCase().includes(lower) || (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [query, staticItems]);

  const allItems = useMemo(() => {
    return [...liveResults, ...filteredStatic];
  }, [liveResults, filteredStatic]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = allItems[selectedIndex];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item: CommandItem) => {
    if (item.action) {
      item.action();
    } else if (item.module) {
      onNavigate(item.module);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, modules, customers, tickets (e.g. 'Air', 'Hajj', 'Rahman')..."
            className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 text-base font-medium focus:outline-none"
          />
          {searching && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-400 bg-slate-200/60 rounded-lg">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-slate-50">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-400 mt-1">Try searching for a different keyword or client name</p>
            </div>
          ) : (
            <div className="py-1 space-y-1">
              {allItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all ${
                      isSelected ? 'bg-primary-50 text-primary-950 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                        {item.icon}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{item.title}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                            {item.category}
                          </span>
                        </div>
                        {item.subtitle && <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>}
                      </div>
                    </div>
                    {isSelected && <ArrowRight className="w-4 h-4 text-primary-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs text-[11px] font-semibold text-slate-600">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs text-[11px] font-semibold text-slate-600">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-xs text-[11px] font-semibold text-slate-600">↵</kbd>
              Open
            </span>
          </div>
          <span className="font-medium text-slate-500">SMT Spotlight Search</span>
        </div>
      </div>
    </div>
  );
}
