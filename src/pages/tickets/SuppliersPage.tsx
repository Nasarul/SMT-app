import { useState, useEffect } from 'react';
import { Building2, Plus, Search, AlertCircle, CheckCircle, ExternalLink, Mail, Phone, MapPin, Users } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface Supplier {
  id: string;
  company_name: string;
  contact_person: string;
  mobile: string;
  email: string;
  address: string;
  current_balance: number;
  is_active: boolean;
}

const emptyForm = {
  company_name: '',
  contact_person: '',
  mobile: '',
  email: '',
  address: '',
  current_balance: 0,
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('company_name');
    
    if (error) {
      console.error('Error loading suppliers:', error);
    } else {
      setSuppliers(data || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.company_name || !form.contact_person || !form.mobile) {
      setError('Company name, contact person and mobile are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: err } = await supabase
        .from('suppliers')
        .insert([form]);

      if (err) throw err;

      setSuccess('Supplier registered successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadSuppliers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile?.includes(search)
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Register Supplier
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-9" 
            placeholder="Search by company name, contact person or mobile..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading suppliers...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSuppliers.length === 0 ? (
            <div className="col-span-full">
              <EmptyState 
                icon={Building2} 
                title="No suppliers found" 
                description="Register an agency to start tracking purchases" 
              />
            </div>
          ) : (
            filteredSuppliers.map(supplier => (
              <div key={supplier.id} className="card p-5 hover:border-primary-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-secondary-100 rounded-xl flex items-center justify-center text-secondary-600 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                    <Building2 size={24} />
                  </div>
                  <Badge variant={supplier.is_active ? 'success' : 'neutral'}>
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <h3 className="text-lg font-bold text-neutral-800 mb-1">{supplier.company_name}</h3>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                  <Users size={14} /> {supplier.contact_person}
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-3 text-sm text-neutral-600">
                    <Phone size={14} className="text-neutral-400" /> {supplier.mobile}
                  </div>
                  {supplier.email && (
                    <div className="flex items-center gap-3 text-sm text-neutral-600">
                      <Mail size={14} className="text-neutral-400" /> {supplier.email}
                    </div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-3 text-sm text-neutral-600 line-clamp-1">
                      <MapPin size={14} className="text-neutral-400 mt-0.5 shrink-0" /> {supplier.address}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Current Balance</div>
                    <div className="text-lg font-mono font-bold text-neutral-800">{formatBDT(supplier.current_balance)}</div>
                  </div>
                  <button className="btn-outline py-1.5 px-3 text-xs flex items-center gap-2">
                    Statement <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Register Supplier Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Ticket Supplier Agency">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Company Name *</label>
              <input className="input-field" value={form.company_name} onChange={e => f('company_name', e.target.value)} placeholder="Agency Name" />
            </div>
            <div>
              <label className="label">Contact Person *</label>
              <input className="input-field" value={form.contact_person} onChange={e => f('contact_person', e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile Number *</label>
              <input className="input-field" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email Address</label>
              <input type="email" className="input-field" value={form.email} onChange={e => f('email', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Office Address</label>
              <textarea className="input-field min-h-[80px]" value={form.address} onChange={e => f('address', e.target.value)} />
            </div>
            <div>
              <label className="label">Opening Balance (if any)</label>
              <input type="number" className="input-field font-mono" value={form.current_balance} onChange={e => f('current_balance', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Register Supplier'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
