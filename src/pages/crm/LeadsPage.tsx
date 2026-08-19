import { useState, useEffect } from 'react';
import { TrendingUp, Plus, Search, Phone, MessageCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Lead {
  id: string;
  full_name: string;
  mobile: string;
  email: string;
  source: string;
  interest: string;
  status: string;
  follow_up_date: string;
  notes: string;
  created_at: string;
}

const emptyForm = {
  full_name: '', mobile: '', email: '',
  source: 'facebook', interest: 'umrah', status: 'new',
  follow_up_date: '', notes: '',
};

const statusOrder = ['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost'];
const statusColors: Record<string, string> = {
  new: 'primary', contacted: 'primary', quoted: 'warning',
  negotiating: 'warning', won: 'success', lost: 'error',
};
const sourceIcons: Record<string, string> = {
  facebook: 'fb', walk_in: 'wi', phone: '📞', whatsapp: 'wa',
  referral: '👥', website: '🌐', other: '—',
};

export function LeadsPage() {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { loadLeads(); }, []);

  const loadLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.mobile) {
      setError('Name and mobile are required.');
      return;
    }
    setSaving(true);
    setError('');
    const cleanedData: Record<string, any> = { ...form };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') cleanedData[key] = null;
    });

    const { error: err } = await supabase.from('crm_leads').insert([{
      ...cleanedData, created_by: profile?.id, assigned_to: profile?.id,
    }]);
    if (err) { setError(err.message); } else {
      setSuccess('Lead added!');
      setShowForm(false);
      setForm(emptyForm);
      loadLeads();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('crm_leads').update({ status }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  const filtered = leads.filter(l =>
    (l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     l.mobile?.includes(search)) &&
    (!filterStatus || l.status === filterStatus)
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  // Lead funnel counts
  const funnelCounts = statusOrder.slice(0, -2).reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {Object.entries(funnelCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`card p-3 text-left hover:shadow-card-hover transition-all ${filterStatus === status ? 'ring-2 ring-primary-400' : ''}`}
          >
            <div className="text-xl font-bold text-neutral-800">{count}</div>
            <Badge variant={statusColors[status] as any} className="mt-1 capitalize">{status}</Badge>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {statusOrder.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Leads Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Lead</th>
                <th className="table-header text-left">Source</th>
                <th className="table-header text-left">Interest</th>
                <th className="table-header text-left">Follow Up</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6}>
                  <EmptyState icon={TrendingUp} title="No leads found" description="Add your first lead to start the pipeline" />
                </td></tr>
              )}
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="font-medium text-neutral-800">{lead.full_name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                      <Phone size={11} /> {lead.mobile}
                    </div>
                  </td>
                  <td className="table-cell">
                    <Badge variant="neutral" className="capitalize">{sourceIcons[lead.source] || ''} {lead.source.replace('_', ' ')}</Badge>
                  </td>
                  <td className="table-cell text-sm capitalize">{lead.interest.replace('_', ' ')}</td>
                  <td className="table-cell text-sm text-neutral-600">{formatDate(lead.follow_up_date)}</td>
                  <td className="table-cell text-center">
                    <select
                      value={lead.status}
                      onChange={e => updateStatus(lead.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0 cursor-pointer ${
                        lead.status === 'won' ? 'bg-success-100 text-success-700' :
                        lead.status === 'lost' ? 'bg-error-100 text-error-600' :
                        lead.status === 'negotiating' ? 'bg-warning-100 text-warning-700' :
                        'bg-primary-100 text-primary-700'
                      }`}
                    >
                      {statusOrder.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <a href={`tel:${lead.mobile}`} className="p-1.5 rounded-lg hover:bg-success-50 text-neutral-400 hover:text-success-600 transition-colors">
                        <Phone size={14} />
                      </a>
                      <a href={`https://wa.me/880${lead.mobile.replace(/^0/, '')}`} target="_blank" rel="noreferrer"
                        className="p-1.5 rounded-lg hover:bg-success-50 text-neutral-400 hover:text-success-600 transition-colors">
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add New Lead">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div>
              <label className="label">Full Name *</label>
              <input className="input-field" value={form.full_name} onChange={e => f('full_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile *</label>
              <input className="input-field" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={e => f('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Lead Source</label>
              <select className="input-field" value={form.source} onChange={e => f('source', e.target.value)}>
                <option value="facebook">Facebook</option>
                <option value="walk_in">Walk-in</option>
                <option value="phone">Phone Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Interested In</label>
              <select className="input-field" value={form.interest} onChange={e => f('interest', e.target.value)}>
                <option value="umrah">Umrah</option>
                <option value="hajj">Hajj</option>
                <option value="domestic_tour">Domestic Tour</option>
                <option value="international_tour">International Tour</option>
                <option value="air_ticket">Air Ticket</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Follow Up Date</label>
              <input type="date" className="input-field" value={form.follow_up_date} onChange={e => f('follow_up_date', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Add Lead'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
