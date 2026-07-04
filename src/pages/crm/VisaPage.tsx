import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Globe, Calendar, CheckCircle, AlertCircle, Clock, Trash2, Edit2, MapPin, MessageSquare } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sendWhatsAppMessage, formatVisaWhatsApp } from '../../lib/whatsapp';

interface Visa {
  id: string;
  passenger_name: string;
  passport_number: string;
  visa_type: string;
  country: string;
  status: string;
  submission_date: string;
  delivery_date: string;
  total_amount: number;
  profit: number;
  mobile?: string;
  created_at: string;
}

const emptyForm = {
  passenger_name: '',
  passport_number: '',
  visa_type: 'tourist',
  country: '',
  status: 'pending',
  submission_date: '',
  delivery_date: '',
  visa_fee: 0,
  service_charge: 500,
  cost_amount: 0,
  mobile: '',
};

export function VisaPage() {
  const { profile } = useAuth();
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadVisas();
  }, []);

  const loadVisas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('visas')
      .select('*')
      .order('created_at', { ascending: false });
    setVisas(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.passenger_name || !form.country || !form.visa_type) {
      setError('Please fill required fields.');
      return;
    }
    setSaving(true);
    setError('');

    const total = Number(form.visa_fee) + Number(form.service_charge);
    const profit = total - Number(form.cost_amount);

    const cleanedData = { ...form };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') cleanedData[key] = null;
    });

    const { error: err } = await supabase.from('visas').insert([{
      ...cleanedData,
      total_amount: total,
      profit,
      created_by: profile?.id
    }]);

    if (err) {
      setError(err.message);
    } else {
      setSuccess('Visa application recorded!');
      setShowForm(false);
      setForm(emptyForm);
      loadVisas();
    }
    setSaving(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stamped': return 'success';
      case 'rejected': return 'error';
      case 'processing': return 'warning';
      case 'submitted': return 'primary';
      default: return 'neutral';
    }
  };

  const filtered = visas.filter(v => 
    v.passenger_name.toLowerCase().includes(search.toLowerCase()) ||
    v.passport_number.toLowerCase().includes(search.toLowerCase()) ||
    v.country.toLowerCase().includes(search.toLowerCase())
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Visa Processing</h2>
          <p className="text-sm text-neutral-500">Track visa applications and documentation</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Application
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name, passport or country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-48">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="stamped">Stamped</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Passenger</th>
                <th className="table-header text-left">Visa Details</th>
                <th className="table-header text-left">Dates</th>
                <th className="table-header text-right">Total Amount</th>
                <th className="table-header text-right">Profit</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">WhatsApp</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400">Loading applications...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={Globe} title="No visa records" description="Start tracking your first visa application" /></td></tr>
              ) : (
                filtered.map(visa => (
                  <tr key={visa.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="font-medium text-neutral-800">{visa.passenger_name}</div>
                      <div className="text-xs text-neutral-400">{visa.passport_number}</div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-primary-600">
                        <MapPin size={12} /> {visa.country}
                      </div>
                      <div className="text-xs text-neutral-500 uppercase">{visa.visa_type}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-xs text-neutral-600 flex items-center gap-1">
                        <Clock size={10} /> Sub: {formatDate(visa.submission_date) || 'TBD'}
                      </div>
                      <div className="text-xs text-neutral-600 flex items-center gap-1 mt-1">
                        <CheckCircle size={10} /> Del: {formatDate(visa.delivery_date) || 'TBD'}
                      </div>
                    </td>
                    <td className="table-cell text-right font-mono font-semibold">
                      {formatBDT(visa.total_amount)}
                    </td>
                    <td className="table-cell text-right text-sm">
                      <span className={visa.profit >= 0 ? 'text-success-600' : 'text-error-600'}>
                        {formatBDT(visa.profit)}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={getStatusBadge(visa.status) as any} className="uppercase text-[10px]">
                        {visa.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-center">
                      <button 
                        onClick={() => {
                          const msg = formatVisaWhatsApp(visa);
                          const phone = visa.mobile || '';
                          if (!phone) alert('Please add a mobile number to send WhatsApp update.');
                          else sendWhatsAppMessage(phone, msg);
                        }}
                        className="p-1.5 hover:bg-success-50 text-success-600 rounded-lg transition-colors"
                        title="Send Status to WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>
                    </td>
                    <td className="table-cell text-right">
                      <button className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-primary-600">
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Application Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Visa Application" size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Passenger Name *</label>
              <input className="input-field" value={form.passenger_name} onChange={e => f('passenger_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Passport Number *</label>
              <input className="input-field" value={form.passport_number} onChange={e => f('passport_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile Number (for WhatsApp)</label>
              <input className="input-field" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="017xxxxxxxx" />
            </div>
            <div>
              <label className="label">Country *</label>
              <input className="input-field" value={form.country} onChange={e => f('country', e.target.value)} placeholder="e.g. Saudi Arabia" />
            </div>
            <div>
              <label className="label">Visa Type</label>
              <select className="input-field" value={form.visa_type} onChange={e => f('visa_type', e.target.value)}>
                <option value="tourist">Tourist</option>
                <option value="business">Business</option>
                <option value="umrah">Umrah</option>
                <option value="hajj">Hajj</option>
                <option value="work">Work/Employment</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="processing">Processing</option>
                <option value="stamped">Stamped</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Submission Date</label>
              <input type="date" className="input-field" value={form.submission_date} onChange={e => f('submission_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Expected Delivery</label>
              <input type="date" className="input-field" value={form.delivery_date} onChange={e => f('delivery_date', e.target.value)} />
            </div>
          </div>

          <div className="section-divider" />
          
          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Fees & Commission (BDT)</h3>
            <div className="form-grid">
              <div>
                <label className="label">Visa Fee</label>
                <input type="number" className="input-field" value={form.visa_fee} onChange={e => f('visa_fee', e.target.value)} />
              </div>
              <div>
                <label className="label">Service Charge</label>
                <input type="number" className="input-field" value={form.service_charge} onChange={e => f('service_charge', e.target.value)} />
              </div>
              <div>
                <label className="label">Cost Amount (Net)</label>
                <input type="number" className="input-field" value={form.cost_amount} onChange={e => f('cost_amount', e.target.value)} />
              </div>
              <div>
                <label className="label">Profit (Auto)</label>
                <div className="input-field bg-neutral-50 font-bold text-success-600">
                  {formatBDT((Number(form.visa_fee) + Number(form.service_charge)) - Number(form.cost_amount))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Record Visa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
