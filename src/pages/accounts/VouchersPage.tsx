import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Download, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { sendWhatsAppMessage, formatReceiptWhatsApp } from '../../lib/whatsapp';

interface Voucher {
  id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  party_name: string;
  cost_center: string;
  description: string;
  amount: number;
  payment_mode: string;
  mobile?: string;
  created_at: string;
}

const emptyForm = {
  voucher_type: 'payment', voucher_date: new Date().toISOString().split('T')[0],
  party_name: '', cost_center: 'admin', description: '',
  debit_account: '', credit_account: '', amount: 0,
  payment_mode: 'cash', bank_account: '', cheque_number: '', reference: '',
  mobile: '',
};

const voucherTypeColors: Record<string, string> = {
  payment: 'error', receipt: 'success', journal: 'primary', contra: 'warning',
};

const voucherTypeLabels: Record<string, string> = {
  payment: 'Payment Voucher', receipt: 'Receipt Voucher',
  journal: 'Journal Voucher', contra: 'Contra Voucher',
};

export function VouchersPage() {
  const { profile } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadVouchers(); }, []);

  const loadVouchers = async () => {
    setLoading(true);
    const { data } = await supabase.from('accounts_vouchers').select('*').order('voucher_date', { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || Number(form.amount) <= 0) {
      setError('Description and amount are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('accounts_vouchers').insert([{
      ...form, created_by: profile?.id,
    }]);
    if (err) { setError(err.message); } else {
      setSuccess('Voucher created successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadVouchers();
    }
    setSaving(false);
  };

  const filtered = vouchers.filter(v =>
    v.voucher_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.party_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.description?.toLowerCase().includes(search.toLowerCase())
  );

  const totalByType = (type: string) =>
    vouchers.filter(v => v.voucher_type === type).reduce((s, v) => s + v.amount, 0);

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> New Voucher
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {['payment', 'receipt', 'journal', 'contra'].map(type => (
          <div key={type} className="card p-4">
            <div className="text-xs text-neutral-500 mb-1 capitalize">{voucherTypeLabels[type]}</div>
            <div className="text-lg font-bold text-neutral-800">{formatBDT(totalByType(type))}</div>
            <div className="text-xs text-neutral-400">{vouchers.filter(v => v.voucher_type === type).length} vouchers</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search vouchers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-44">
          <option value="">All Types</option>
          <option value="payment">Payment</option>
          <option value="receipt">Receipt</option>
          <option value="journal">Journal</option>
          <option value="contra">Contra</option>
        </select>
        <select className="input-field sm:w-36">
          <option value="">All Centers</option>
          <option value="ticket">Ticket</option>
          <option value="umrah">Umrah</option>
          <option value="hajj">Hajj</option>
          <option value="tours">Tours</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn-outline flex items-center gap-2">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Voucher #</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Party</th>
                <th className="table-header text-left">Description</th>
                <th className="table-header text-left">Cost Center</th>
                <th className="table-header text-left">Payment Mode</th>
                <th className="table-header text-center">Type</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-center">Share</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon={FileText} title="No vouchers found" description="Create your first voucher entry" />
                </td></tr>
              )}
              {filtered.map(voucher => (
                <tr key={voucher.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <span className="font-mono text-xs text-primary-600 font-semibold">{voucher.voucher_number}</span>
                  </td>
                  <td className="table-cell text-sm">{formatDate(voucher.voucher_date)}</td>
                  <td className="table-cell text-sm font-medium text-neutral-700">{voucher.party_name || '—'}</td>
                  <td className="table-cell text-sm text-neutral-600 max-w-xs truncate">{voucher.description}</td>
                  <td className="table-cell">
                    <Badge variant="neutral" className="capitalize">{voucher.cost_center}</Badge>
                  </td>
                  <td className="table-cell text-sm capitalize">{voucher.payment_mode}</td>
                  <td className="table-cell text-center">
                    <Badge variant={voucherTypeColors[voucher.voucher_type] as any} className="text-[10px]">
                      {voucher.voucher_type.toUpperCase()}
                    </Badge>
                  </td>
                  <td className={`table-cell text-right font-bold text-sm ${
                    voucher.voucher_type === 'receipt' ? 'text-success-600' : 'text-error-600'
                  }`}>
                    {formatBDT(voucher.amount)}
                  </td>
                  <td className="table-cell text-center">
                    <button 
                      onClick={() => {
                        const msg = formatReceiptWhatsApp(voucher);
                        const phone = voucher.mobile || '';
                        if (!phone) alert('Please add a mobile number to share receipt.');
                        else sendWhatsAppMessage(phone, msg);
                      }}
                      className="p-1.5 hover:bg-success-50 text-success-600 rounded-lg transition-colors"
                      title="Share Receipt on WhatsApp"
                    >
                      <MessageSquare size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-neutral-50">
                  <td colSpan={7} className="table-cell text-right font-semibold text-neutral-600">Total:</td>
                  <td className="table-cell text-right font-bold text-neutral-800">
                    {formatBDT(filtered.reduce((s, v) => s + v.amount, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* New Voucher Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Voucher Entry">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {['payment', 'receipt', 'journal', 'contra'].map(type => (
              <button
                key={type}
                onClick={() => f('voucher_type', type)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.voucher_type === type
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}
              >
                {voucherTypeLabels[type]}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input-field" value={form.voucher_date} onChange={e => f('voucher_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Cost Center</label>
              <select className="input-field" value={form.cost_center} onChange={e => f('cost_center', e.target.value)}>
                <option value="ticket">Air Ticket</option>
                <option value="umrah">Umrah</option>
                <option value="hajj">Hajj</option>
                <option value="tours">Tours</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Party Name</label>
              <input className="input-field" value={form.party_name} onChange={e => f('party_name', e.target.value)} placeholder="Customer / Supplier name" />
            </div>
            <div>
              <label className="label">Debit Account</label>
              <input className="input-field" value={form.debit_account} onChange={e => f('debit_account', e.target.value)} placeholder="e.g. Cash / Bank" />
            </div>
            <div>
              <label className="label">Credit Account</label>
              <input className="input-field" value={form.credit_account} onChange={e => f('credit_account', e.target.value)} placeholder="e.g. Sales Revenue" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea className="input-field" rows={2} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Narration / details..." />
            </div>
            <div className="sm:col-span-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <label className="text-[10px] font-bold text-primary-400 uppercase mb-2 block">Multi-Currency Converter</label>
              <div className="flex items-end gap-3">
                <div className="w-24">
                  <label className="text-[10px] text-neutral-500 mb-1 block">Currency</label>
                  <select 
                    id="currency-type" 
                    className="input-field py-1 text-sm"
                    onChange={() => {
                      const amount = Number((document.getElementById('foreign-amount') as HTMLInputElement)?.value || 0);
                      const rate = Number((document.getElementById('exchange-rate') as HTMLInputElement)?.value || 0);
                      if (amount > 0 && rate > 0) f('amount', (amount * rate).toFixed(2));
                    }}
                  >
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="MYR">MYR (Malaysian Ringgit)</option>
                    <option value="SGD">SGD (Singapore Dollar)</option>
                    <option value="QAR">QAR (Qatari Riyal)</option>
                    <option value="KWD">KWD (Kuwaiti Dinar)</option>
                    <option value="JPY">JPY (Japanese Yen)</option>
                    <option value="CNY">CNY (Chinese Yuan)</option>
                    <option value="INR">INR (Indian Rupee)</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-neutral-500 mb-1 block">Foreign Amount</label>
                  <input 
                    type="number" 
                    className="input-field py-1 text-sm" 
                    placeholder="0.00" 
                    id="foreign-amount"
                    onChange={(e) => {
                      const amount = Number(e.target.value);
                      const rate = Number((document.getElementById('exchange-rate') as HTMLInputElement)?.value || 0);
                      if (amount > 0 && rate > 0) f('amount', (amount * rate).toFixed(2));
                    }}
                  />
                </div>
                <div className="w-28">
                  <label className="text-[10px] text-neutral-500 mb-1 block">Ex. Rate (to BDT)</label>
                  <input 
                    type="number" 
                    className="input-field py-1 text-sm" 
                    placeholder="Rate" 
                    id="exchange-rate"
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const amount = Number((document.getElementById('foreign-amount') as HTMLInputElement)?.value || 0);
                      if (amount > 0 && rate > 0) f('amount', (amount * rate).toFixed(2));
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Amount *</label>
              <input type="number" className="input-field font-semibold" value={form.amount} onChange={e => f('amount', e.target.value)} />
            </div>
            <div>
              <label className="label">Payment Mode</label>
              <select className="input-field" value={form.payment_mode} onChange={e => f('payment_mode', e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="rocket">Rocket</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            {form.payment_mode === 'cheque' && (
              <div>
                <label className="label">Cheque Number</label>
                <input className="input-field" value={form.cheque_number} onChange={e => f('cheque_number', e.target.value)} />
              </div>
            )}
            {form.payment_mode === 'bank' && (
              <div>
                <label className="label">Bank Account</label>
                <input className="input-field" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} placeholder="DBBL / Islami Bank..." />
              </div>
            )}
            <div>
              <label className="label">Reference</label>
              <input className="input-field" value={form.reference} onChange={e => f('reference', e.target.value)} placeholder="Invoice / receipt no." />
            </div>
            <div>
              <label className="label">Mobile (WhatsApp)</label>
              <input className="input-field" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="017xxxxxxxx" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Post Voucher'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
