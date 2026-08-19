import { useState, useEffect } from 'react';
import { Landmark, Plus, Search, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, BLOOD_GROUPS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { audit } from '../../lib/audit';

interface HajjPilgrim {
  id: string;
  full_name: string;
  passport_number: string;
  passport_expiry: string;
  gender: string;
  blood_group: string;
  hajj_serial: string;
  package_price: number;
  total_paid: number;
  govt_fee_paid: boolean;
  visa_status: string;
  status: string;
  created_at: string;
  hajj_packages?: { package_name: string; package_type: string };
}

interface HajjPackage {
  id: string;
  package_name: string;
  package_type: string;
  price: number;
}

const emptyForm = {
  package_id: '', full_name: '', passport_number: '', passport_expiry: '',
  nid: '', date_of_birth: '', blood_group: 'B+', gender: 'male',
  hajj_serial: '', mahram_declaration: '', health_declaration: false,
  meningitis_vaccine: false, shoe_size: '', clothing_size: '',
  muassasa: '', mutawwif: '', package_price: 0, total_paid: 0,
  govt_fee_paid: false,
};

export function HajjPilgrimsPage() {
  const [pilgrims, setPilgrims] = useState<HajjPilgrim[]>([]);
  const [packages, setPackages] = useState<HajjPackage[]>([]);
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
    const [pilgrimsRes, pkgRes] = await Promise.all([
      supabase.from('hajj_pilgrims').select('*, hajj_packages(package_name, package_type)').order('created_at', { ascending: false }),
      supabase.from('hajj_packages').select('*').eq('is_active', true),
    ]);
    setPilgrims(pilgrimsRes.data || []);
    setPackages(pkgRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.passport_number || !form.package_id) {
      setError('Package, full name, and passport number are required.');
      return;
    }
    setSaving(true);
    setError('');
    const cleanedData: Record<string, any> = { ...form };
    Object.keys(cleanedData).forEach(key => {
      if (cleanedData[key] === '') cleanedData[key] = null;
    });

    const { error: err } = await supabase.from('hajj_pilgrims').insert([cleanedData]);
    if (err) { setError(err.message); } else {
      audit.pilgrim('Hajj', 'CREATE', form.full_name, form.passport_number, cleanedData);
      setSuccess('Pilgrim registered!');
      setShowForm(false);
      setForm(emptyForm);
      loadData();
    }
    setSaving(false);
  };

  const filtered = pilgrims.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.passport_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.hajj_serial?.includes(search)
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const statusColors: Record<string, string> = {
    registered: 'primary', visa_applied: 'warning', visa_approved: 'success',
    departed: 'neutral', completed: 'neutral', cancelled: 'error',
  };

  const balance = (p: HajjPilgrim) => p.package_price - p.total_paid;

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Register Pilgrim
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      <div className="card p-4 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search by name, passport, serial..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-40">
          <option value="">All Status</option>
          <option value="registered">Registered</option>
          <option value="visa_applied">Visa Applied</option>
          <option value="visa_approved">Visa Approved</option>
          <option value="departed">Departed</option>
        </select>
        <button className="btn-outline flex items-center gap-2"><Download size={15} /> Export</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Pilgrim</th>
                <th className="table-header text-left">Passport</th>
                <th className="table-header text-left">Package</th>
                <th className="table-header text-left">Hajj Serial</th>
                <th className="table-header text-center">Health Checks</th>
                <th className="table-header text-center">Govt Fee</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon={Landmark} title="No pilgrims registered" description="Register Hajj pilgrims for this season" />
                </td></tr>
              )}
              {filtered.map(pilgrim => (
                <tr key={pilgrim.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="font-medium text-neutral-800">{pilgrim.full_name}</div>
                    <div className="text-xs text-neutral-400">{pilgrim.gender} · {pilgrim.blood_group}</div>
                  </td>
                  <td className="table-cell">
                    <div className="font-mono text-sm">{pilgrim.passport_number}</div>
                    <div className="text-xs text-neutral-400">Exp: {formatDate(pilgrim.passport_expiry)}</div>
                  </td>
                  <td className="table-cell text-sm">
                    <div>{pilgrim.hajj_packages?.package_name || '—'}</div>
                    {pilgrim.hajj_packages?.package_type && (
                      <Badge variant={pilgrim.hajj_packages.package_type === 'government' ? 'primary' : 'gold'} className="text-[10px] mt-0.5">
                        {pilgrim.hajj_packages.package_type}
                      </Badge>
                    )}
                  </td>
                  <td className="table-cell font-mono text-sm">{pilgrim.hajj_serial || '—'}</td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${(pilgrim as any).meningitis_vaccine ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-400'}`}>M</span>
                      <span className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center font-bold ${(pilgrim as any).health_declaration ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-400'}`}>H</span>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    {pilgrim.govt_fee_paid
                      ? <Badge variant="success">Paid</Badge>
                      : <Badge variant="error">Pending</Badge>}
                  </td>
                  <td className="table-cell text-center">
                    <Badge variant={statusColors[pilgrim.status] as any} className="text-[10px]">
                      {pilgrim.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className={`table-cell text-right font-bold text-sm ${balance(pilgrim) > 0 ? 'text-error-600' : 'text-success-600'}`}>
                    {balance(pilgrim) > 0 ? formatBDT(balance(pilgrim)) : 'Clear'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Hajj Pilgrim" size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Hajj Package *</label>
              <select className="input-field" value={form.package_id} onChange={e => {
                const pkg = packages.find(p => p.id === e.target.value);
                f('package_id', e.target.value);
                if (pkg) f('package_price', pkg.price);
              }}>
                <option value="">Select package</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.package_name} — {p.package_type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input className="input-field" value={form.full_name} onChange={e => f('full_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input-field" value={form.gender} onChange={e => f('gender', e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Passport Number *</label>
              <input className="input-field font-mono" value={form.passport_number} onChange={e => f('passport_number', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Passport Expiry</label>
              <input type="date" className="input-field" value={form.passport_expiry} onChange={e => f('passport_expiry', e.target.value)} />
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
              <label className="label">NID</label>
              <input className="input-field" value={form.nid} onChange={e => f('nid', e.target.value)} />
            </div>
            <div>
              <label className="label">Hajj Application Serial</label>
              <input className="input-field" value={form.hajj_serial} onChange={e => f('hajj_serial', e.target.value)} placeholder="Islamic Foundation BD serial" />
            </div>
            {form.gender === 'female' && (
              <div>
                <label className="label">Mahram Declaration</label>
                <input className="input-field" value={form.mahram_declaration} onChange={e => f('mahram_declaration', e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Shoe Size</label>
              <input className="input-field" value={form.shoe_size} onChange={e => f('shoe_size', e.target.value)} />
            </div>
            <div>
              <label className="label">Clothing Size</label>
              <input className="input-field" value={form.clothing_size} onChange={e => f('clothing_size', e.target.value)} />
            </div>
            <div>
              <label className="label">Muassasa</label>
              <input className="input-field" value={form.muassasa} onChange={e => f('muassasa', e.target.value)} />
            </div>
            <div>
              <label className="label">Mutawwif</label>
              <input className="input-field" value={form.mutawwif} onChange={e => f('mutawwif', e.target.value)} />
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
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={form.health_declaration} onChange={e => f('health_declaration', e.target.checked)} className="rounded" />
              Health Declaration
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={form.meningitis_vaccine} onChange={e => f('meningitis_vaccine', e.target.checked)} className="rounded" />
              Meningitis Vaccine
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input type="checkbox" checked={form.govt_fee_paid} onChange={e => f('govt_fee_paid', e.target.checked)} className="rounded" />
              Govt. Fee Paid
            </label>
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
