import React, { useState, useEffect } from 'react';
import { Moon, Plus, Star, MapPin, Utensils, Croissant as Visa, AlertCircle, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, UMRAH_SEASONS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface UmrahPackage {
  id: string;
  package_name: string;
  duration_nights: number;
  hotel_category: number;
  makkah_hotel: string;
  madinah_hotel: string;
  makkah_distance_meters: number;
  madinah_distance_meters: number;
  meal_plan: string;
  visa_included: boolean;
  price_sharing: number;
  price_triple: number;
  price_double: number;
  price_single: number;
  season: string;
  is_active: boolean;
}

const emptyForm = {
  package_name: '', duration_nights: 14, hotel_category: 3,
  makkah_hotel: '', madinah_hotel: '',
  makkah_distance_meters: 500, madinah_distance_meters: 300,
  meal_plan: 'without', visa_included: true,
  price_sharing: 0, price_triple: 0, price_double: 0, price_single: 0,
  season: 'regular',
};

export function UmrahPackagesPage() {
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadPackages(); }, []);

  const loadPackages = async () => {
    setLoading(true);
    const { data } = await supabase.from('umrah_packages').select('*').order('created_at', { ascending: false });
    setPackages(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.package_name || !form.makkah_hotel || !form.madinah_hotel) {
      setError('Package name, Makkah hotel, and Madinah hotel are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('umrah_packages').insert([form]);
    if (err) { setError(err.message); } else {
      setSuccess('Package created successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadPackages();
    }
    setSaving(false);
  };

  const toggleActive = async (pkg: UmrahPackage) => {
    await supabase.from('umrah_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    loadPackages();
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const seasonLabels: Record<string, string> = {
    regular: 'Regular', ramadan: 'Ramadan', peak: 'Peak', off_peak: 'Off-Peak',
  };

  const seasonColors: Record<string, string> = {
    regular: 'neutral', ramadan: 'gold', peak: 'warning', off_peak: 'primary',
  };

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
        <div className="text-center py-12 text-neutral-400">Loading packages...</div>
      ) : packages.length === 0 ? (
        <EmptyState icon={Moon} title="No packages created" description="Create your first Umrah package to start bookings" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <div key={pkg.id} className={`card overflow-hidden card-hover ${!pkg.is_active ? 'opacity-60' : ''}`}>
              {/* Header */}
              <div className="islamic-pattern-bg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-white text-base">{pkg.package_name}</h3>
                    <p className="text-primary-200 text-sm mt-0.5">{pkg.duration_nights} Nights</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: pkg.hotel_category }).map((_, i) => (
                      <Star key={i} size={12} className="text-gold-400 fill-gold-400" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={seasonColors[pkg.season] as any}>{seasonLabels[pkg.season]}</Badge>
                  {pkg.visa_included && <Badge variant="success">Visa Included</Badge>}
                  <Badge variant={pkg.meal_plan === 'with' ? 'primary' : 'neutral'}>
                    {pkg.meal_plan === 'with' ? 'Meals Included' : pkg.meal_plan === 'breakfast_only' ? 'Breakfast Only' : 'No Meals'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <MapPin size={11} className="text-primary-500" />
                    <span className="font-medium">Makkah:</span> {pkg.makkah_hotel} ({pkg.makkah_distance_meters}m from Haram)
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <MapPin size={11} className="text-gold-500" />
                    <span className="font-medium">Madinah:</span> {pkg.madinah_hotel} ({pkg.madinah_distance_meters}m from Masjid Nabawi)
                  </div>
                </div>

                <div className="section-divider" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {pkg.price_sharing > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Sharing (4-bed)</div>
                      <div className="font-bold text-neutral-800">{formatBDT(pkg.price_sharing)}</div>
                    </div>
                  )}
                  {pkg.price_triple > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Triple</div>
                      <div className="font-bold text-neutral-800">{formatBDT(pkg.price_triple)}</div>
                    </div>
                  )}
                  {pkg.price_double > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Double</div>
                      <div className="font-bold text-neutral-800">{formatBDT(pkg.price_double)}</div>
                    </div>
                  )}
                  {pkg.price_single > 0 && (
                    <div className="bg-neutral-50 rounded-lg p-2">
                      <div className="text-neutral-500">Single</div>
                      <div className="font-bold text-neutral-800">{formatBDT(pkg.price_single)}</div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Status</span>
                  <button onClick={() => toggleActive(pkg)} className="flex items-center gap-1.5 text-xs font-medium">
                    {pkg.is_active ? (
                      <><span className="text-success-600">Active</span><ToggleRight size={18} className="text-success-500" /></>
                    ) : (
                      <><span className="text-neutral-400">Inactive</span><ToggleLeft size={18} className="text-neutral-400" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Package Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Umrah Package" size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Package Name *</label>
              <input className="input-field" value={form.package_name} onChange={e => f('package_name', e.target.value)} placeholder="e.g. Economy Umrah Package 2025" />
            </div>
            <div>
              <label className="label">Duration (Nights) *</label>
              <input type="number" className="input-field" value={form.duration_nights} onChange={e => f('duration_nights', e.target.value)} />
            </div>
            <div>
              <label className="label">Hotel Category</label>
              <select className="input-field" value={form.hotel_category} onChange={e => f('hotel_category', Number(e.target.value))}>
                <option value={3}>3 Star</option>
                <option value={4}>4 Star</option>
                <option value={5}>5 Star</option>
              </select>
            </div>
            <div>
              <label className="label">Season</label>
              <select className="input-field" value={form.season} onChange={e => f('season', e.target.value)}>
                {UMRAH_SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Makkah Hotel *</label>
              <input className="input-field" value={form.makkah_hotel} onChange={e => f('makkah_hotel', e.target.value)} />
            </div>
            <div>
              <label className="label">Distance from Haram (meters)</label>
              <input type="number" className="input-field" value={form.makkah_distance_meters} onChange={e => f('makkah_distance_meters', e.target.value)} />
            </div>
            <div>
              <label className="label">Madinah Hotel *</label>
              <input className="input-field" value={form.madinah_hotel} onChange={e => f('madinah_hotel', e.target.value)} />
            </div>
            <div>
              <label className="label">Distance from Nabawi (meters)</label>
              <input type="number" className="input-field" value={form.madinah_distance_meters} onChange={e => f('madinah_distance_meters', e.target.value)} />
            </div>
            <div>
              <label className="label">Meal Plan</label>
              <select className="input-field" value={form.meal_plan} onChange={e => f('meal_plan', e.target.value)}>
                <option value="without">Without Meals</option>
                <option value="with">With Meals</option>
                <option value="breakfast_only">Breakfast Only</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="visa" checked={form.visa_included} onChange={e => f('visa_included', e.target.checked)} className="w-4 h-4 rounded text-primary-500" />
              <label htmlFor="visa" className="text-sm font-medium text-neutral-700">Visa Included</label>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Pricing</h3>
            <div className="form-grid">
              <div>
                <label className="label">Sharing (4-bed)</label>
                <input type="number" className="input-field" value={form.price_sharing} onChange={e => f('price_sharing', e.target.value)} />
              </div>
              <div>
                <label className="label">Triple</label>
                <input type="number" className="input-field" value={form.price_triple} onChange={e => f('price_triple', e.target.value)} />
              </div>
              <div>
                <label className="label">Double</label>
                <input type="number" className="input-field" value={form.price_double} onChange={e => f('price_double', e.target.value)} />
              </div>
              <div>
                <label className="label">Single</label>
                <input type="number" className="input-field" value={form.price_single} onChange={e => f('price_single', e.target.value)} />
              </div>
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
