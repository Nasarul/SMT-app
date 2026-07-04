import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, BLOOD_GROUPS, getStatusColor } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface Pilgrim {
  id: string;
  full_name: string;
  passport_number: string;
  passport_expiry: string;
  gender: string;
  blood_group: string;
  room_type: string;
  package_price: number;
  total_paid: number;
  visa_status: string;
  ticket_status: boolean;
  vaccination_status: boolean;
  pre_departure_done: boolean;
  created_at: string;
  umrah_groups?: { group_name: string };
}

interface Group {
  id: string;
  group_name: string;
  departure_date: string;
  airline: string;
  status: string;
  umrah_packages?: { package_name: string };
}

const emptyForm = {
  group_id: '', full_name: '', full_name_arabic: '', passport_number: '',
  passport_issue_date: '', passport_expiry: '', nid: '', date_of_birth: '',
  blood_group: 'B+', gender: 'male', mahram_name: '', mahram_relation: '',
  emergency_contact: '', emergency_phone: '', room_type: 'sharing',
  package_price: 0, total_paid: 0, notes: '',
};

export function UmrahPilgrimsPage() {
  const [pilgrims, setPilgrims] = useState<Pilgrim[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [pilgrimsRes, groupsRes] = await Promise.all([
      supabase.from('umrah_pilgrims').select('*, umrah_groups(group_name)').order('created_at', { ascending: false }),
      supabase.from('umrah_groups').select('*, umrah_packages(package_name)').order('departure_date', { ascending: false }),
    ]);
    setPilgrims(pilgrimsRes.data || []);
    setGroups(groupsRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.group_id || !form.full_name || !form.passport_number) {
      setError('Group, full name, and passport number are required.');
      return;
    }
    setSaving(true);
    setError('');
    const cleanedData = { ...form };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') cleanedData[key] = null;
    });

    const { error: err } = await supabase.from('umrah_pilgrims').insert([cleanedData]);
    if (err) { setError(err.message); } else {
      setSuccess('Pilgrim registered successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadData();
    }
    setSaving(false);
  };

  const updateChecklistItem = async (id: string, field: string, value: boolean) => {
    await supabase.from('umrah_pilgrims').update({ [field]: value }).eq('id', id);
    setPilgrims(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const filtered = pilgrims.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.passport_number?.toLowerCase().includes(search.toLowerCase())
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const visaColors: Record<string, string> = {
    pending: 'neutral', applied: 'warning', approved: 'success',
    rejected: 'error', reapplied: 'primary',
  };

  const balance = (p: Pilgrim) => p.package_price - p.total_paid;

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Umrah Pilgrims</h2>
          <p className="text-sm text-neutral-500">{pilgrims.length} pilgrims registered</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Register Pilgrim
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Search */}
      <div className="card p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search by name or passport..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-48">
          <option value="">All Groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.group_name}</option>)}
        </select>
        <button className="btn-outline flex items-center gap-2">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Name</th>
                <th className="table-header text-left">Passport</th>
                <th className="table-header text-left">Group</th>
                <th className="table-header text-center">Visa</th>
                <th className="table-header text-center">Pre-departure Checklist</th>
                <th className="table-header text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6}>
                  <EmptyState icon={Users} title="No pilgrims registered" description="Register your first Umrah pilgrim" />
                </td></tr>
              )}
              {filtered.map(pilgrim => (
                <tr key={pilgrim.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="font-medium text-neutral-800">{pilgrim.full_name}</div>
                    <div className="text-xs text-neutral-400">{pilgrim.gender} · {pilgrim.blood_group} · {pilgrim.room_type}</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-mono text-sm">{pilgrim.passport_number}</div>
                    <div className="text-xs text-neutral-400">Exp: {formatDate(pilgrim.passport_expiry)}</div>
                  </td>
                  <td className="table-cell text-sm">{(pilgrim as any).umrah_groups?.group_name || '—'}</td>
                  <td className="table-cell text-center">
                    <Badge variant={visaColors[pilgrim.visa_status] as any}>{pilgrim.visa_status}</Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-center gap-2">
                      {[
                        { key: 'ticket_status', label: '✈' },
                        { key: 'vaccination_status', label: '💉' },
                        { key: 'pre_departure_done', label: '✓' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => updateChecklistItem(pilgrim.id, key, !(pilgrim as any)[key])}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                            (pilgrim as any)[key]
                              ? 'bg-success-100 text-success-700'
                              : 'bg-neutral-100 text-neutral-400'
                          }`}
                          title={key}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className={`font-semibold text-sm ${balance(pilgrim) > 0 ? 'text-error-600' : 'text-success-600'}`}>
                      {balance(pilgrim) > 0 ? `Due: ${formatBDT(balance(pilgrim))}` : 'Paid'}
                    </div>
                    <div className="text-xs text-neutral-400">{formatBDT(pilgrim.total_paid)} paid</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Umrah Pilgrim" size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Group Assignment</h3>
            <div>
              <label className="label">Umrah Group *</label>
              <select className="input-field" value={form.group_id} onChange={e => f('group_id', e.target.value)}>
                <option value="">Select group</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.group_name} — {formatDate(g.departure_date)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Pilgrim Information</h3>
            <div className="form-grid">
              <div>
                <label className="label">Full Name (as per passport) *</label>
                <input className="input-field" value={form.full_name} onChange={e => f('full_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Name in Arabic</label>
                <input className="input-field text-right" dir="rtl" value={form.full_name_arabic} onChange={e => f('full_name_arabic', e.target.value)} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input-field" value={form.gender} onChange={e => f('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input-field" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} />
              </div>
              <div>
                <label className="label">Blood Group</label>
                <select className="input-field" value={form.blood_group} onChange={e => f('blood_group', e.target.value)}>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="label">NID Number</label>
                <input className="input-field" value={form.nid} onChange={e => f('nid', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Passport Details</h3>
            <div className="form-grid">
              <div>
                <label className="label">Passport Number *</label>
                <input className="input-field font-mono" value={form.passport_number} onChange={e => f('passport_number', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Issue Date</label>
                <input type="date" className="input-field" value={form.passport_issue_date} onChange={e => f('passport_issue_date', e.target.value)} />
              </div>
              <div>
                <label className="label">Expiry Date</label>
                <input type="date" className="input-field" value={form.passport_expiry} onChange={e => f('passport_expiry', e.target.value)} />
              </div>
            </div>
          </div>

          {form.gender === 'female' && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Mahram Information (Female Pilgrims)</h3>
              <div className="form-grid">
                <div>
                  <label className="label">Mahram Name</label>
                  <input className="input-field" value={form.mahram_name} onChange={e => f('mahram_name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Relation</label>
                  <input className="input-field" value={form.mahram_relation} onChange={e => f('mahram_relation', e.target.value)} placeholder="Husband/Father/Brother" />
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Package & Payment</h3>
            <div className="form-grid">
              <div>
                <label className="label">Room Type</label>
                <select className="input-field" value={form.room_type} onChange={e => f('room_type', e.target.value)}>
                  <option value="sharing">Sharing (4-bed)</option>
                  <option value="triple">Triple</option>
                  <option value="double">Double</option>
                  <option value="single">Single</option>
                </select>
              </div>
              <div>
                <label className="label">Package Price (৳)</label>
                <input type="number" className="input-field" value={form.package_price} onChange={e => f('package_price', e.target.value)} />
              </div>
              <div>
                <label className="label">Initial Payment (৳)</label>
                <input type="number" className="input-field" value={form.total_paid} onChange={e => f('total_paid', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Register Pilgrim'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
