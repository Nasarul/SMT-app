import { useState, useEffect } from 'react';
import { Building2, Plus, Search, DollarSign, TrendingDown, Trash2, Edit2, Shield, Briefcase, Calculator } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Asset {
  id: string;
  asset_name: string;
  asset_type: 'liquid' | 'fixed';
  category: 'cash' | 'furniture' | 'equipment' | 'vehicle' | 'office_space' | 'other';
  acquisition_date: string;
  initial_value: number;
  current_value: number;
  depreciation_rate: number;
  status: string;
  notes: string;
  created_at: string;
}

const emptyForm = {
  asset_name: '',
  asset_type: 'fixed',
  category: 'equipment',
  acquisition_date: new Date().toISOString().split('T')[0],
  initial_value: 0,
  current_value: 0,
  depreciation_rate: 0,
  status: 'active',
  notes: '',
};

export function AssetsPage() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    const { data } = await supabase.from('assets').select('*').order('acquisition_date', { ascending: false });
    setAssets(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.asset_name || !form.initial_value) {
      setError('Please provide asset name and value.');
      return;
    }
    setSaving(true);
    setError('');

    // If current value is not set, use initial value
    const finalForm = { 
      ...form, 
      current_value: form.current_value || form.initial_value 
    };

    const { error: err } = await supabase.from('assets').insert([finalForm]);

    if (err) {
      setError(err.message);
    } else {
      // Also create a journal voucher for the investment
      await supabase.from('accounts_vouchers').insert([{
        voucher_type: 'journal',
        cost_center: 'investment',
        party_name: 'Opening Investment',
        description: `Initial investment recorded: ${form.asset_name} (${form.category})`,
        amount: form.initial_value,
        payment_mode: 'cash',
        created_by: profile?.id
      }]);

      setSuccess('Asset recorded successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadAssets();
    }
    setSaving(false);
  };

  const filtered = assets.filter(a =>
    a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
  const liquidAssets = assets.filter(a => a.asset_type === 'liquid').reduce((sum, a) => sum + Number(a.current_value), 0);
  const fixedAssets = assets.filter(a => a.asset_type === 'fixed').reduce((sum, a) => sum + Number(a.current_value), 0);

  const f = (field: string, val: any) => setForm((prev: any) => ({ ...prev, [field]: val }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Record New Asset
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-6 text-sm">
          <Shield size={16} /> {success}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
          <div className="flex items-center justify-between mb-2">
            <Briefcase size={20} className="opacity-80" />
            <Badge variant="primary" className="bg-white/20 text-white border-none">Total Value</Badge>
          </div>
          <div className="text-2xl font-black">{formatBDT(totalValue)}</div>
          <div className="text-[10px] uppercase font-bold mt-1 opacity-70 tracking-wider">Net Worth of Assets</div>
        </div>
        <div className="card p-5 border-l-4 border-success-500">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={20} className="text-success-600" />
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Liquid Assets</span>
          </div>
          <div className="text-2xl font-black text-neutral-800">{formatBDT(liquidAssets)}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Cash, Bank & Equivalents</div>
        </div>
        <div className="card p-5 border-l-4 border-secondary-500">
          <div className="flex items-center justify-between mb-2">
            <Building2 size={20} className="text-secondary-600" />
            <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Fixed Assets</span>
          </div>
          <div className="text-2xl font-black text-neutral-800">{formatBDT(fixedAssets)}</div>
          <div className="text-[10px] text-neutral-500 mt-1">Furniture, Equipment & Tools</div>
        </div>
      </div>

      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by asset name or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-48">
          <option value="">All Categories</option>
          <option value="cash">Cash / Liquid</option>
          <option value="furniture">Furniture</option>
          <option value="equipment">Office Equipment</option>
          <option value="vehicle">Vehicles</option>
          <option value="office_space">Office Space</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="table-header text-left">Asset Name</th>
                <th className="table-header text-left">Category</th>
                <th className="table-header text-left">Type</th>
                <th className="table-header text-left">Acquisition</th>
                <th className="table-header text-right">Initial Value</th>
                <th className="table-header text-right">Current Value</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-neutral-400 text-sm italic">Loading assets inventory...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <EmptyState icon={Briefcase} title="No assets recorded" description="Start by recording your initial office furniture or equipment" />
                </td></tr>
              ) : (
                filtered.map(asset => (
                  <tr key={asset.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell font-bold text-neutral-800">{asset.asset_name}</td>
                    <td className="table-cell">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-tighter">{asset.category}</span>
                    </td>
                    <td className="table-cell">
                      <Badge variant={asset.asset_type === 'liquid' ? 'success' : 'neutral'} className="text-[9px] uppercase">
                        {asset.asset_type}
                      </Badge>
                    </td>
                    <td className="table-cell text-sm text-neutral-600">{formatDate(asset.acquisition_date)}</td>
                    <td className="table-cell text-right font-mono text-neutral-400 text-xs">{formatBDT(asset.initial_value)}</td>
                    <td className="table-cell text-right font-black text-neutral-900">{formatBDT(asset.current_value)}</td>
                    <td className="table-cell text-center">
                      <Badge variant={asset.status === 'active' ? 'success' : 'error'} className="text-[10px]">
                        {asset.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 hover:bg-neutral-100 text-neutral-400 rounded-lg"><Edit2 size={14} /></button>
                        <button className="p-1.5 hover:bg-error-50 text-error-400 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Record New Investment / Asset" size="lg">
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <Calculator size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="label">Asset Name / Description *</label>
              <input className="input-field" value={form.asset_name} onChange={e => f('asset_name', e.target.value)} placeholder="e.g. Executive Desk, HP Laptop, Office Rent Deposit" />
            </div>
            
            <div>
              <label className="label">Asset Type</label>
              <select className="input-field" value={form.asset_type} onChange={e => f('asset_type', e.target.value)}>
                <option value="fixed">Fixed Asset (Non-Liquid)</option>
                <option value="liquid">Liquid Asset (Cash/Bank)</option>
              </select>
            </div>
            
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.category} onChange={e => f('category', e.target.value)}>
                <option value="cash">Cash / Bank Balance</option>
                <option value="furniture">Furniture & Fixtures</option>
                <option value="equipment">Office Equipment / IT</option>
                <option value="vehicle">Vehicles</option>
                <option value="office_space">Office Space / Building</option>
                <option value="other">Other Assets</option>
              </select>
            </div>

            <div>
              <label className="label">Acquisition Date</label>
              <input type="date" className="input-field" value={form.acquisition_date} onChange={e => f('acquisition_date', e.target.value)} />
            </div>

            <div>
              <label className="label">Initial Value (BDT) *</label>
              <input type="number" className="input-field font-black" value={form.initial_value} onChange={e => f('initial_value', e.target.value)} />
            </div>

            <div>
              <label className="label">Depreciation Rate (Annual %)</label>
              <div className="relative">
                <TrendingDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="number" className="input-field pl-9" value={form.depreciation_rate} onChange={e => f('depreciation_rate', e.target.value)} placeholder="0" />
              </div>
            </div>

            <div>
              <label className="label">Current Net Value (Auto-updates)</label>
              <input type="number" className="input-field bg-neutral-50 text-neutral-500" value={form.current_value || form.initial_value} onChange={e => f('current_value', e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <label className="label">Additional Notes</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Any specific details about the asset..." />
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-xl border border-primary-100 flex items-start gap-3">
            <Shield size={18} className="text-primary-600 mt-0.5" />
            <p className="text-xs text-primary-800 leading-relaxed">
              <strong>Note:</strong> Recording an asset will automatically create a **Journal Voucher** in the accounting system to reflect this as an opening investment/capital.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 py-3 font-bold">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 font-black shadow-lg shadow-primary-200">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Recording...' : 'Record Investment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
