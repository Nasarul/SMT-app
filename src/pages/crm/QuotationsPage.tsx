import { useState, useEffect } from 'react';
import { FileText, Search, Trash2, Printer, PlusCircle, MinusCircle, CheckCircle, AlertCircle, Plane } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_mobile: string;
  subject: string;
  date: string;
  expiry_date: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  status: string;
  notes: string;
}

const emptyItem = { description: '', quantity: 1, unit_price: 0, total: 0 };
const emptyForm = {
  customer_name: '',
  customer_mobile: '',
  subject: '',
  date: new Date().toISOString().split('T')[0],
  expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  items: [{ ...emptyItem, id: '1' }],
  discount: 0,
  notes: '1. This quotation is valid for 7 days.\n2. Prices may change based on seat/room availability.\n3. Full payment required to confirm booking.',
};

export function QuotationsPage() {
  const { profile } = useAuth();
  const { company } = useSettings();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    setLoading(true);
    const { data } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
    setQuotations(data || []);
    setLoading(false);
  };

  const calculateSubtotal = (items: any[]) => items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { ...emptyItem, id: Math.random().toString(36).substr(2, 9) }]
    });
  };

  const handleRemoveItem = (id: string) => {
    if (form.items.length === 1) return;
    setForm({
      ...form,
      items: form.items.filter((item: any) => item.id !== id)
    });
  };

  const updateItem = (id: string, field: string, value: any) => {
    const newItems = form.items.map((item: any) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = Number(updated.quantity) * Number(updated.unit_price);
        return updated;
      }
      return item;
    });
    setForm({ ...form, items: newItems });
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.subject || form.items.some((i: any) => !i.description)) {
      setError('Please fill required fields and item descriptions.');
      return;
    }
    setSaving(true);
    setError('');

    const subtotal = calculateSubtotal(form.items);
    const total = subtotal - Number(form.discount);

    const { error: err } = await supabase.from('quotations').insert([{
      ...form,
      subtotal,
      total_amount: total,
      created_by: profile?.id,
      status: 'sent'
    }]);

    if (err) {
      setError(err.message);
    } else {
      setSuccess('Quotation generated successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadQuotations();
    }
    setSaving(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const f = (field: string, val: any) => setForm((prev: any) => ({ ...prev, [field]: val }));

  const filtered = quotations.filter(q =>
    q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in no-print">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <PlusCircle size={16} /> Create Quotation
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-6 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Search Bar */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by customer, subject or quote number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Quotations Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Quote #</th>
                <th className="table-header text-left">Date</th>
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left">Subject</th>
                <th className="table-header text-right">Total Amount</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-neutral-400">Loading quotations...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}><EmptyState icon={FileText} title="No quotations found" description="Create professional quotes for your clients" /></td></tr>
              ) : (
                filtered.map(quote => (
                  <tr key={quote.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs text-primary-600 font-bold">{quote.quotation_number}</td>
                    <td className="table-cell text-sm">{formatDate(quote.date)}</td>
                    <td className="table-cell">
                      <div className="font-bold text-neutral-800">{quote.customer_name}</div>
                      <div className="text-[10px] text-neutral-400">{quote.customer_mobile}</div>
                    </td>
                    <td className="table-cell text-sm text-neutral-600 truncate max-w-[200px]">{quote.subject}</td>
                    <td className="table-cell text-right font-black text-neutral-900">{formatBDT(quote.total_amount)}</td>
                    <td className="table-cell text-center">
                      <Badge variant="primary" className="text-[10px] uppercase">{quote.status}</Badge>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedQuotation(quote); setShowPreview(true); }}
                          className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"
                          title="View & Print"
                        >
                          <Printer size={16} />
                        </button>
                        <button className="p-1.5 hover:bg-error-50 text-error-400 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Quotation Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Professional Quotation" size="xl">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Customer Name *</label>
              <input className="input-field" value={form.customer_name} onChange={e => f('customer_name', e.target.value)} placeholder="Full Name" />
            </div>
            <div>
              <label className="label">Mobile Number</label>
              <input className="input-field" value={form.customer_mobile} onChange={e => f('customer_mobile', e.target.value)} placeholder="017xxxxxxxx" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Subject / Package Title *</label>
              <input className="input-field" value={form.subject} onChange={e => f('subject', e.target.value)} placeholder="e.g. 10 Days Luxury Umrah Package / Dubai Tour Quote" />
            </div>
            <div>
              <label className="label">Quote Date</label>
              <input type="date" className="input-field" value={form.date} onChange={e => f('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Valid Until</label>
              <input type="date" className="input-field" value={form.expiry_date} onChange={e => f('expiry_date', e.target.value)} />
            </div>
          </div>

          <div className="section-divider" />

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-widest">Service Breakdown</h3>
              <button onClick={handleAddItem} className="text-xs font-bold text-primary-600 flex items-center gap-1 hover:text-primary-700 transition-colors">
                <PlusCircle size={14} /> Add Line Item
              </button>
            </div>
            
            <div className="space-y-3">
              {form.items.map((item: any) => (
                <div key={item.id} className="flex flex-col md:flex-row gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100 relative group">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Description</label>
                    <input 
                      className="input-field text-sm" 
                      value={item.description} 
                      onChange={e => updateItem(item.id, 'description', e.target.value)} 
                      placeholder="e.g. Round-trip Flight (DAC-JED-DAC)" 
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Qty</label>
                    <input 
                      type="number" 
                      className="input-field text-sm" 
                      value={item.quantity} 
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)} 
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Unit Price (BDT)</label>
                    <input 
                      type="number" 
                      className="input-field text-sm font-semibold" 
                      value={item.unit_price} 
                      onChange={e => updateItem(item.id, 'unit_price', e.target.value)} 
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 block">Total</label>
                    <div className="input-field bg-white/50 text-sm font-bold text-neutral-700">
                      {formatBDT(item.total)}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute -right-2 -top-2 p-1 bg-white border border-error-100 text-error-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MinusCircle size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="label">Terms & Conditions</label>
              <textarea 
                className="input-field text-xs leading-relaxed" 
                rows={5} 
                value={form.notes} 
                onChange={e => f('notes', e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-neutral-500">
                <span>Subtotal</span>
                <span>{formatBDT(calculateSubtotal(form.items))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500">Discount (BDT)</span>
                <input 
                  type="number" 
                  className="input-field w-32 text-right text-sm py-1" 
                  value={form.discount} 
                  onChange={e => f('discount', e.target.value)} 
                />
              </div>
              <div className="pt-3 border-t-2 border-neutral-100 flex items-center justify-between">
                <span className="text-lg font-black text-neutral-800 uppercase tracking-widest">Total Amount</span>
                <span className="text-2xl font-black text-primary-600">{formatBDT(calculateSubtotal(form.items) - Number(form.discount))}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-neutral-100">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-3 font-bold">Discard</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-black shadow-lg shadow-primary-200">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Generating...' : 'Save & Generate Quote'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Quotation Preview & Print View */}
      {selectedQuotation && (
        <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Quotation Preview" size="xl">
          <div className="p-4 flex flex-col h-[85vh]">
            <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 rounded-xl border border-neutral-200 shadow-inner">
              <div id="quotation-print-area" className="bg-white p-12 mx-auto max-w-[800px] min-h-[1050px] shadow-2xl print:shadow-none print:p-0">
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-primary-500 pb-8 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
                      <Plane size={32} className="text-white rotate-45" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-neutral-800 tracking-tight uppercase">{company.name}</h1>
                      <p className="text-xs font-bold text-primary-600 uppercase tracking-widest">{company.tagline || 'Excellence in Travel'}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">{company.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-4xl font-black text-neutral-200 uppercase tracking-tighter mb-2">QUOTATION</h2>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-end gap-2 text-neutral-500">
                        <span className="font-bold">Number:</span>
                        <span className="font-mono text-primary-600 font-bold">{selectedQuotation.quotation_number}</span>
                      </div>
                      <div className="flex justify-end gap-2 text-neutral-500">
                        <span className="font-bold">Date:</span>
                        <span className="font-bold">{formatDate(selectedQuotation.date)}</span>
                      </div>
                      <div className="flex justify-end gap-2 text-neutral-500">
                        <span className="font-bold">Valid Until:</span>
                        <span className="font-bold text-error-600">{formatDate(selectedQuotation.expiry_date)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Quotation For:</h3>
                    <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                      <div className="text-lg font-black text-neutral-800 mb-1">{selectedQuotation.customer_name}</div>
                      <div className="text-sm text-neutral-600 font-medium">Mobile: {selectedQuotation.customer_mobile || 'N/A'}</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3">Subject:</h3>
                    <div className="text-lg font-bold text-primary-700 leading-tight">
                      {selectedQuotation.subject}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-12">
                  <thead>
                    <tr className="bg-primary-600 text-white">
                      <th className="py-4 px-6 text-left text-xs font-black uppercase tracking-widest rounded-tl-xl">Description</th>
                      <th className="py-4 px-4 text-center text-xs font-black uppercase tracking-widest">Qty</th>
                      <th className="py-4 px-4 text-right text-xs font-black uppercase tracking-widest">Unit Price</th>
                      <th className="py-4 px-6 text-right text-xs font-black uppercase tracking-widest rounded-tr-xl">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 border-x border-neutral-100">
                    {selectedQuotation.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/30'}>
                        <td className="py-5 px-6 text-sm font-bold text-neutral-700">{item.description}</td>
                        <td className="py-5 px-4 text-center text-sm font-bold text-neutral-500">{item.quantity}</td>
                        <td className="py-5 px-4 text-right text-sm font-mono text-neutral-600">{formatBDT(item.unit_price)}</td>
                        <td className="py-5 px-6 text-right text-sm font-black text-neutral-900">{formatBDT(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-neutral-100">
                      <td colSpan={2} rowSpan={3} className="py-8 px-6 align-top">
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">Terms & Conditions:</div>
                        <div className="text-[10px] text-neutral-500 leading-relaxed whitespace-pre-line">
                          {selectedQuotation.notes}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-xs font-bold text-neutral-500 uppercase">Subtotal</td>
                      <td className="py-4 px-6 text-right text-sm font-bold text-neutral-800">{formatBDT(selectedQuotation.subtotal)}</td>
                    </tr>
                    {selectedQuotation.discount > 0 && (
                      <tr>
                        <td className="py-4 px-4 text-right text-xs font-bold text-error-500 uppercase">Discount</td>
                        <td className="py-4 px-6 text-right text-sm font-bold text-error-500">- {formatBDT(selectedQuotation.discount)}</td>
                      </tr>
                    )}
                    <tr className="bg-neutral-900 text-white">
                      <td className="py-5 px-4 text-right text-xs font-black uppercase tracking-widest">Grand Total</td>
                      <td className="py-5 px-6 text-right text-xl font-black text-primary-400">{formatBDT(selectedQuotation.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Footer Signatures */}
                <div className="grid grid-cols-2 gap-24 mt-24">
                  <div className="border-t border-neutral-300 pt-4 text-center">
                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Customer Acceptance</div>
                    <div className="text-[10px] text-neutral-300 italic">Sign & Date</div>
                  </div>
                  <div className="border-t border-primary-300 pt-4 text-center">
                    <div className="text-xs font-bold text-neutral-800 uppercase tracking-widest mb-1">Authorized Signature</div>
                    <div className="text-[10px] text-primary-600 font-bold uppercase tracking-tight">{company.name}</div>
                  </div>
                </div>

                <div className="mt-16 pt-8 border-t border-neutral-50 text-center">
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-[0.2em]">
                    This is a computer generated quotation and requires an authorized signature for validation.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-6 border-t border-neutral-100">
              <button onClick={() => setShowPreview(false)} className="btn-ghost flex-1 py-3 font-bold">Close Preview</button>
              <button onClick={handlePrint} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-black shadow-lg shadow-primary-200">
                <Printer size={18} /> Print or Save as PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Global CSS for printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quotation-print-area, #quotation-print-area * { visibility: visible; }
          #quotation-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 2cm;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
