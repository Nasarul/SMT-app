import { useState, useEffect } from 'react';
import { Landmark, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface HajjPackage {
  id: string;
  package_name: string;
  package_type: string;
  maktab_number: string;
  mina_building: string;
  arafat_camp: string;
  tent_category: string;
  price: number;
  season_year: number;
  is_active: boolean;
}

const emptyForm = {
  package_name: '', package_type: 'private', maktab_number: '',
  mina_building: '', arafat_camp: '', tent_category: 'standard',
  price: 0, season_year: 2025,
};

export function HajjPackagesPage() {
  const [packages, setPackages] = useState<HajjPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadPackages(); }, []);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('hajj_packages').select('*').order('created_at', { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.package_name) { setError('Package name is required.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('hajj_packages').insert([form]);
    if (err) { setError(err.message); } else {
      setSuccess('Package created!');
      setShowForm(false);
      setForm(emptyForm);
      loadPackages();
    }
    setSaving(false);
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Create Package
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading...</div>
      ) : packages.length === 0 ? (
        <EmptyState icon={Landmark} title="No Hajj packages" description="Create packages for this Hajj season" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className="card overflow-hidden card-hover">
              <div className="bg-gradient-to-r from-secondary-700 to-secondary-500 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-white">{pkg.package_name}</h3>
                    <p className="text-primary-200 text-xs mt-0.5">Hajj Season {pkg.season_year}</p>
                  </div>
                  <Badge variant={pkg.package_type === 'government' ? 'primary' : 'gold'}>
                    {pkg.package_type}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {pkg.maktab_number && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Maktab No.</div>
                      <div className="font-semibold">{pkg.maktab_number}</div>
                    </div>
                  )}
                  {pkg.tent_category && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Tent Category</div>
                      <div className="font-semibold capitalize">{pkg.tent_category}</div>
                    </div>
                  )}
                  {pkg.mina_building && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Mina Building</div>
                      <div className="font-semibold">{pkg.mina_building}</div>
                    </div>
                  )}
                  {pkg.arafat_camp && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Arafat Camp</div>
                      <div className="font-semibold">{pkg.arafat_camp}</div>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-sm text-neutral-500">Package Price</span>
                  <span className="text-lg font-bold text-neutral-800">{formatBDT(pkg.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Hajj Package">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Package Name *</label>
              <input className="input-field" value={form.package_name} onChange={e => f('package_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Package Type</label>
              <select className="input-field" value={form.package_type} onChange={e => f('package_type', e.target.value)}>
                <option value="government">Government</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label className="label">Season Year</label>
              <input type="number" className="input-field" value={form.season_year} onChange={e => f('season_year', e.target.value)} />
            </div>
            <div>
              <label className="label">Maktab Number</label>
              <input className="input-field" value={form.maktab_number} onChange={e => f('maktab_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Tent Category</label>
              <select className="input-field" value={form.tent_category} onChange={e => f('tent_category', e.target.value)}>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="deluxe">Deluxe</option>
              </select>
            </div>
            <div>
              <label className="label">Mina Building</label>
              <input className="input-field" value={form.mina_building} onChange={e => f('mina_building', e.target.value)} />
            </div>
            <div>
              <label className="label">Arafat Camp</label>
              <input className="input-field" value={form.arafat_camp} onChange={e => f('arafat_camp', e.target.value)} />
            </div>
            <div>
              <label className="label">Package Price</label>
              <input type="number" className="input-field" value={form.price} onChange={e => f('price', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Create Package'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
