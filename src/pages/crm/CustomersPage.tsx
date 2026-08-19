import { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, AlertCircle, CheckCircle, Star, Edit2, FileText, Upload, Trash2, Download } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { BANGLADESH_GEO_DATA } from '../../lib/geoData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Customer {
  id: string;
  customer_code: string;
  full_name: string;
  mobile: string;
  email: string;
  nid: string;
  passport_number: string;
  district: string;
  division: string;
  category: string;
  is_hajj_alumni: boolean;
  is_umrah_alumni: boolean;
  created_at: string;
}

const emptyForm = {
  full_name: '', mobile: '', email: '', nid: '',
  passport_number: '', passport_expiry: '', date_of_birth: '',
  gender: 'male', division: 'Dhaka', district: 'Dhaka', upazila: '',
  address: '', profession: '', category: 'regular',
};

const categoryColors: Record<string, string> = {
  vip: 'gold', regular: 'primary', one_time: 'neutral', prospect: 'warning',
};

export function CustomersPage() {
  const { profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Dynamic Geo State
  const divisions = Object.keys(BANGLADESH_GEO_DATA);
  const selectedDivision = BANGLADESH_GEO_DATA[form.division as keyof typeof BANGLADESH_GEO_DATA] || {};
  const districts = Object.keys(selectedDivision);
  const upazilas = form.district ? (selectedDivision[form.district as keyof typeof selectedDivision] || []) : [];

  useEffect(() => {
    // Reset district if it's not in the new division's districts
    if (form.division && !districts.includes(form.district)) {
      setForm(prev => ({ ...prev, district: districts[0] || '' }));
    }
  }, [form.division, districts]);

  useEffect(() => {
    // Reset upazila if it's not in the new district's upazilas
    if (form.district && !upazilas.includes(form.upazila)) {
      setForm(prev => ({ ...prev, upazila: upazilas[0] || '' }));
    }
  }, [form.district, upazilas]);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.mobile) {
      setError('Full name and mobile are required.');
      return;
    }
    setSaving(true);
    setError('');
    
    try {
      const cleanedData: Record<string, any> = { ...form };
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === '') cleanedData[key] = null;
      });

      if (editingCustomer) {
        const { error: err } = await supabase
          .from('customers')
          .update(cleanedData)
          .eq('id', editingCustomer.id);
        if (err) throw err;
        setSuccess('Customer updated successfully!');
      } else {
        const { error: err } = await supabase
          .from('customers')
          .insert([{ ...cleanedData, created_by: profile?.id }]);
        if (err) throw err;
        setSuccess('Customer added successfully!');
      }
      
      setShowForm(false);
      setEditingCustomer(null);
      setForm(emptyForm);
      loadCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    // Fetch full data if necessary, or just use what we have
    setForm({
      full_name: customer.full_name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      nid: customer.nid || '',
      passport_number: customer.passport_number || '',
      passport_expiry: (customer as any).passport_expiry || '',
      date_of_birth: (customer as any).date_of_birth || '',
      gender: (customer as any).gender || 'male',
      division: customer.division || 'Dhaka',
      district: customer.district || '',
      upazila: (customer as any).upazila || '',
      address: (customer as any).address || '',
      profession: (customer as any).profession || '',
      category: customer.category || 'regular',
    });
    setShowForm(true);
    setError('');
  };

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile?.includes(search) ||
    c.passport_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.nid?.includes(search)
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setEditingCustomer(null); setForm(emptyForm); setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Search & Filter */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search by name, mobile, passport, NID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field sm:w-36">
          <option value="">All Categories</option>
          <option value="vip">VIP</option>
          <option value="regular">Regular</option>
          <option value="one_time">One-time</option>
          <option value="prospect">Prospect</option>
        </select>
        <select className="input-field sm:w-36">
          <option value="">All Divisions</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Customer</th>
                <th className="table-header text-left">Contact</th>
                <th className="table-header text-left">Documents</th>
                <th className="table-header text-left">Location</th>
                <th className="table-header text-center">Category</th>
                <th className="table-header text-center">Alumni</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6}>
                  <EmptyState icon={Users} title="No customers found" description="Add your first customer to get started" />
                </td></tr>
              )}
              {filtered.map(customer => (
                <tr key={customer.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary-700">
                          {customer.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-neutral-800">{customer.full_name}</div>
                        <div className="text-xs text-neutral-400 font-mono">{customer.customer_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-neutral-700">
                      <Phone size={12} className="text-neutral-400" /> {customer.mobile}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                        <Mail size={11} /> {customer.email}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    {customer.nid && <div className="text-xs text-neutral-600">NID: {customer.nid}</div>}
                    {customer.passport_number && <div className="text-xs text-neutral-400 font-mono">{customer.passport_number}</div>}
                  </td>
                  <td className="table-cell text-sm text-neutral-600">
                    {customer.district && `${customer.district}, `}{customer.division}
                  </td>
                  <td className="table-cell text-center">
                    <Badge variant={categoryColors[customer.category] as any}>
                      {customer.category === 'vip' && <Star size={10} className="mr-0.5 fill-current" />}
                      {customer.category}
                    </Badge>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {customer.is_hajj_alumni && <Badge variant="gold">Hajj</Badge>}
                      {customer.is_umrah_alumni && <Badge variant="primary">Umrah</Badge>}
                      {!customer.is_hajj_alumni && !customer.is_umrah_alumni && <span className="text-neutral-300">—</span>}
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => { setSelectedCustomer(customer); setShowDocModal(true); }}
                        className="p-1.5 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                        title="Manage Documents"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(customer)}
                        className="p-1.5 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Personal Information</h3>
            <div className="form-grid">
              <div>
                <label className="label">Full Name *</label>
                <input className="input-field" value={form.full_name} onChange={e => f('full_name', e.target.value)} />
              </div>
              <div>
                <label className="label">Gender</label>
                <select className="input-field" value={form.gender} onChange={e => f('gender', e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" className="input-field" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} />
              </div>
              <div>
                <label className="label">Profession</label>
                <input className="input-field" value={form.profession} onChange={e => f('profession', e.target.value)} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input-field" value={form.category} onChange={e => f('category', e.target.value)}>
                  <option value="vip">VIP</option>
                  <option value="regular">Regular</option>
                  <option value="one_time">One-time</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Contact Details</h3>
            <div className="form-grid">
              <div>
                <label className="label">Mobile *</label>
                <input className="input-field" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input-field" value={form.email} onChange={e => f('email', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Documents</h3>
            <div className="form-grid">
              <div>
                <label className="label">NID Number</label>
                <input className="input-field" value={form.nid} onChange={e => f('nid', e.target.value)} />
              </div>
              <div>
                <label className="label">Passport Number</label>
                <input className="input-field font-mono" value={form.passport_number} onChange={e => f('passport_number', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="label">Passport Expiry</label>
                <input type="date" className="input-field" value={form.passport_expiry} onChange={e => f('passport_expiry', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Address</h3>
            <div className="form-grid">
              <div>
                <label className="label">Division</label>
                <select className="input-field font-medium" value={form.division} onChange={e => f('division', e.target.value)}>
                  <option value="">Select Division</option>
                  {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">District</label>
                <select 
                  className="input-field font-medium" 
                  value={form.district} 
                  onChange={e => f('district', e.target.value)}
                  disabled={!form.division}
                >
                  <option value="">Select District</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Upazila</label>
                <select 
                  className="input-field font-medium" 
                  value={form.upazila} 
                  onChange={e => f('upazila', e.target.value)}
                  disabled={!form.district}
                >
                  <option value="">Select Upazila</option>
                  {upazilas.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Full Address</label>
                <input className="input-field" value={form.address} onChange={e => f('address', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </div>
      </Modal>
      {/* Document Management Modal */}
      <Modal isOpen={showDocModal} onClose={() => setShowDocModal(false)} title={`Documents: ${selectedCustomer?.full_name}`} size="md">
        <div className="p-5 space-y-4">
          <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-primary-600">
              <Upload size={20} />
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-neutral-800">Upload New Document</div>
              <div className="text-xs text-neutral-400">PDF, JPG or PNG (Max 5MB)</div>
            </div>
            <input 
              type="file" 
              className="hidden" 
              id="doc-upload" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !selectedCustomer) return;
                // Upload logic would go here
                alert('Uploading ' + file.name + ' to E-Locker...');
              }} 
            />
            <label htmlFor="doc-upload" className="btn-primary py-2 px-4 text-xs cursor-pointer">
              Choose File
            </label>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Stored Documents</h4>
            <div className="space-y-2">
              {/* Sample Document Items */}
              <div className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-error-50 text-error-600 rounded flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-800">Passport_Copy.pdf</div>
                    <div className="text-[10px] text-neutral-400">Uploaded on May 09, 2026</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 hover:bg-neutral-50 text-neutral-400 rounded-lg"><Download size={14} /></button>
                  <button className="p-1.5 hover:bg-error-50 text-error-400 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
