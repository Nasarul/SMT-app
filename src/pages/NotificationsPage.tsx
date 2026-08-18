import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Clock, Passport as PassportIcon, CreditCard, UserCheck, Search, Filter, ArrowRight, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/constants';
import { Badge } from '../components/ui/Badge';

interface Alert {
  id: string;
  type: 'passport' | 'visa' | 'payment' | 'followup';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  date: string;
  link?: string;
}

export function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const newAlerts: Alert[] = [];
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    try {
      // 1. Passport Expiry Alerts
      const { data: customers } = await supabase
        .from('customers')
        .select('id, full_name, passport_expiry')
        .lte('passport_expiry', sixMonthsFromNow.toISOString().split('T')[0])
        .gte('passport_expiry', today.toISOString().split('T')[0]);

      customers?.forEach(c => {
        newAlerts.push({
          id: `passport-${c.id}`,
          type: 'passport',
          title: 'Passport Expiring Soon',
          description: `${c.full_name}'s passport expires on ${formatDate(c.passport_expiry)}.`,
          priority: 'high',
          date: c.passport_expiry,
          link: 'crm-customers'
        });
      });

      // 2. Visa Status Alerts (Umrah)
      const { data: umrahPilgrims } = await supabase
        .from('umrah_pilgrims')
        .select('id, full_name, visa_status')
        .eq('visa_status', 'pending');

      umrahPilgrims?.forEach(p => {
        newAlerts.push({
          id: `visa-${p.id}`,
          type: 'visa',
          title: 'Pending Visa Application',
          description: `Visa application for ${p.full_name} is still pending.`,
          priority: 'medium',
          date: new Date().toISOString(),
          link: 'umrah-pilgrims'
        });
      });

      // 3. CRM Follow-ups
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id, full_name, follow_up_date')
        .eq('follow_up_date', today.toISOString().split('T')[0]);

      leads?.forEach(l => {
        newAlerts.push({
          id: `lead-${l.id}`,
          type: 'followup',
          title: 'Lead Follow-up Today',
          description: `You have a scheduled follow-up with ${l.full_name}.`,
          priority: 'high',
          date: l.follow_up_date,
          link: 'crm-leads'
        });
      });

      setAlerts(newAlerts.sort((a, b) => (a.priority === 'high' ? -1 : 1)));
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const priorityColors = {
    high: 'error',
    medium: 'warning',
    low: 'neutral'
  };

  const typeIcons = {
    passport: ShieldAlert,
    visa: UserCheck,
    payment: CreditCard,
    followup: Clock
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 space-y-4">
          <div className="card p-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Filter by Type</h3>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Alerts', icon: Bell },
                { id: 'passport', label: 'Passports', icon: ShieldAlert },
                { id: 'visa', label: 'Visas', icon: UserCheck },
                { id: 'followup', label: 'Follow-ups', icon: Clock },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${
                    filter === t.id ? 'bg-primary-50 text-primary-700 font-bold' : 'text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <t.icon size={16} />
                    {t.label}
                  </div>
                  <Badge variant="neutral" className="text-[10px]">{t.id === 'all' ? alerts.length : alerts.filter(a => a.type === t.id).length}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4 bg-primary-600 text-white">
            <h4 className="text-sm font-bold mb-2">Did you know?</h4>
            <p className="text-xs opacity-80 leading-relaxed">
              These notifications are automatically generated based on system records. No manual entry required!
            </p>
          </div>
        </div>

        {/* Alerts List */}
        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-neutral-400">Scanning for alerts...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-success-50 text-success-500 rounded-full flex items-center justify-center mb-4">
                <Bell size={32} />
              </div>
              <h3 className="text-lg font-bold text-neutral-800">All clear!</h3>
              <p className="text-sm text-neutral-500 mt-1">No urgent notifications or expiring documents found.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const Icon = typeIcons[alert.type];
              return (
                <div key={alert.id} className="card p-4 hover:shadow-md transition-all border-l-4 border-l-primary-500">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      alert.priority === 'high' ? 'bg-error-50 text-error-600' : 
                      alert.priority === 'medium' ? 'bg-warning-50 text-warning-600' : 'bg-neutral-50 text-neutral-400'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-neutral-800">{alert.title}</h4>
                        <Badge variant={priorityColors[alert.priority] as any} className="text-[9px]">
                          {alert.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-600 leading-relaxed">{alert.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-[10px] text-neutral-400 font-semibold uppercase flex items-center gap-1">
                          <Clock size={10} /> {alert.type === 'followup' ? 'Scheduled' : 'Action Required'}
                        </div>
                        {alert.link && (
                          <button className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            Go to Module <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
