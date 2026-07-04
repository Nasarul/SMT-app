import React, { useState, useEffect } from 'react';
import { Users, Plus, Calendar, Plane, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, getStatusColor, AIRLINES_FROM_DAC } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface UmrahGroup {
  id: string;
  group_name: string;
  departure_date: string;
  return_date: string;
  airline: string;
  flight_number: string;
  group_leader: string;
  moallim_name: string;
  max_pilgrims: number;
  status: string;
  umrah_packages?: { package_name: string };
}

interface Package {
  id: string;
  package_name: string;
  duration_nights: number;
}

const emptyForm = {
  group_name: '', package_id: '', departure_date: '', return_date: '',
  airline: '', flight_number: '', group_leader: '', moallim_name: '',
  max_pilgrims: 40,
};

export function UmrahGroupsPage() {
  const [groups, setGroups] = useState<UmrahGroup[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [groupsRes, pkgRes] = await Promise.all([
      supabase.from('umrah_groups').select('*, umrah_packages(package_name)').order('departure_date', { ascending: false }),
      supabase.from('umrah_packages').select('id, package_name, duration_nights').eq('is_active', true),
    ]);
    setGroups(groupsRes.data || []);
    setPackages(pkgRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.group_name || !form.departure_date) {
      setError('Group name and departure date are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('umrah_groups').insert([form]);
    if (err) { setError(err.message); } else {
      setSuccess('Group created!');
      setShowForm(false);
      setForm(emptyForm);
      loadData();
    }
    setSaving(false);
  };

  const daysUntilDeparture = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const statusColors: Record<string, string> = {
    open: 'success', closed: 'warning', departed: 'primary',
    completed: 'neutral', cancelled: 'error',
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Umrah Groups</h2>
          <p className="text-sm text-neutral-500">{groups.length} groups created</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Create Group
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading...</div>
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title="No groups created" description="Create an Umrah group to start adding pilgrims" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(group => {
            const days = daysUntilDeparture(group.departure_date);
            return (
              <div key={group.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Users size={18} className="text-primary-600" />
                  </div>
                  <Badge variant={statusColors[group.status] as any}>{group.status}</Badge>
                </div>
                <h3 className="font-heading font-semibold text-neutral-800 text-base mb-0.5">{group.group_name}</h3>
                {group.umrah_packages?.package_name && (
                  <p className="text-xs text-neutral-400 mb-3">{group.umrah_packages.package_name}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Calendar size={13} className="text-primary-500" />
                    <span>Departure: <strong>{formatDate(group.departure_date)}</strong></span>
                  </div>
                  {group.airline && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Plane size={13} className="text-primary-500 rotate-45" />
                      <span>{group.airline} {group.flight_number && `(${group.flight_number})`}</span>
                    </div>
                  )}
                  {group.group_leader && (
                    <div className="text-xs text-neutral-500">Leader: {group.group_leader}</div>
                  )}
                  {group.moallim_name && (
                    <div className="text-xs text-neutral-500">Moallim: {group.moallim_name}</div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Capacity: {group.max_pilgrims} pilgrims</span>
                    {days > 0 ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${days <= 7 ? 'bg-error-100 text-error-600' : days <= 30 ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700'}`}>
                        {days}d to depart
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-neutral-400">Departed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Umrah Group">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Group Name *</label>
              <input className="input-field" value={form.group_name} onChange={e => f('group_name', e.target.value)} placeholder="e.g. Umrah Group January 2025" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Package</label>
              <select className="input-field" value={form.package_id} onChange={e => f('package_id', e.target.value)}>
                <option value="">Select package</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.package_name} ({p.duration_nights}N)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Departure Date *</label>
              <input type="date" className="input-field" value={form.departure_date} onChange={e => f('departure_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Return Date</label>
              <input type="date" className="input-field" value={form.return_date} onChange={e => f('return_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Airline</label>
              <select className="input-field" value={form.airline} onChange={e => f('airline', e.target.value)}>
                <option value="">Select airline</option>
                {AIRLINES_FROM_DAC.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Flight Number</label>
              <input className="input-field font-mono" value={form.flight_number} onChange={e => f('flight_number', e.target.value.toUpperCase())} placeholder="BG101" />
            </div>
            <div>
              <label className="label">Group Leader</label>
              <input className="input-field" value={form.group_leader} onChange={e => f('group_leader', e.target.value)} />
            </div>
            <div>
              <label className="label">Moallim Name</label>
              <input className="input-field" value={form.moallim_name} onChange={e => f('moallim_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Max Pilgrims</label>
              <input type="number" className="input-field" value={form.max_pilgrims} onChange={e => f('max_pilgrims', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Create Group'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
