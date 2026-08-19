import { useState, useEffect } from 'react';
import { Map, Plus, Search, Calendar, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, getStatusColor, TOUR_DESTINATIONS_DOMESTIC, TOUR_DESTINATIONS_INTERNATIONAL } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface Tour {
  id: string;
  tour_name: string;
  tour_type: string;
  destination: string;
  duration_days: number;
  transport_type: string;
  price_per_person: number;
  max_seats: number;
  available_seats: number;
  departure_date: string;
  return_date: string;
  status: string;
  highlights: string;
}

interface ToursPageProps {
  tourType: 'domestic' | 'international';
}

const emptyForm = {
  tour_name: '', tour_type: 'domestic', destination: '',
  duration_days: 3, transport_type: 'ac_bus', accommodation: '',
  meal_plan: 'without', guide_included: false,
  price_per_person: 0, max_seats: 40, departure_date: '',
  return_date: '', highlights: '', itinerary: '',
};

export function ToursPage({ tourType }: ToursPageProps) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm, tour_type: tourType });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTours = async () => {
    setLoading(true);
    const { data } = await supabase.from('tours').select('*').eq('tour_type', tourType).order('departure_date', { ascending: false });
    setTours(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    setForm({ ...emptyForm, tour_type: tourType });
    loadTours(); 
  }, [tourType]);

  const handleSave = async () => {
    if (!form.tour_name || !form.destination || !form.departure_date) {
      setError('Tour name, destination, and departure date are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('tours').insert([{ ...form, tour_type: tourType }]);
    if (err) { setError(err.message); } else {
      setSuccess('Tour created!');
      setShowForm(false);
      setForm({ ...emptyForm, tour_type: tourType });
      loadTours();
    }
    setSaving(false);
  };

  const filtered = tours.filter(t =>
    t.tour_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));
  const destinations = tourType === 'domestic' ? TOUR_DESTINATIONS_DOMESTIC : TOUR_DESTINATIONS_INTERNATIONAL;

  const transportLabels: Record<string, string> = {
    ac_bus: 'AC Bus', microbus: 'Microbus', launch: 'Launch/Boat',
    flight: 'Flight', train: 'Train', private_car: 'Private Car',
  };

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Create Tour
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
          <input className="input-field pl-9" placeholder="Search tours..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-36">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Map} title="No tours found" description={`Create your first ${tourType} tour package`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(tour => (
            <div key={tour.id} className="card overflow-hidden card-hover">
              {/* Header */}
              <div className="relative h-32 bg-gradient-to-br from-primary-500 to-secondary-700 flex items-end p-4">
                <div className="absolute top-3 right-3">
                  <Badge variant={getStatusColor(tour.status) as any}>{tour.status}</Badge>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base leading-tight">{tour.tour_name}</h3>
                  <p className="text-primary-200 text-sm">{tour.destination}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Calendar size={13} className="text-primary-500" />
                    {formatDate(tour.departure_date)}
                  </div>
                  <div className="text-neutral-500">{tour.duration_days} days</div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Users size={13} className="text-primary-500" />
                    {tour.available_seats}/{tour.max_seats} seats left
                  </div>
                  <Badge variant="neutral" className="text-[10px]">{transportLabels[tour.transport_type] || tour.transport_type}</Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="text-sm text-neutral-500">Per Person</span>
                  <span className="text-xl font-bold text-primary-600">{formatBDT(tour.price_per_person)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={`Create ${tourType === 'domestic' ? 'Domestic' : 'International'} Tour`} size="lg">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Tour Name *</label>
              <input className="input-field" value={form.tour_name} onChange={e => f('tour_name', e.target.value)} placeholder="e.g. Cox's Bazar Winter Special 2025" />
            </div>
            <div>
              <label className="label">Destination *</label>
              <select className="input-field" value={form.destination} onChange={e => f('destination', e.target.value)}>
                <option value="">Select destination</option>
                {destinations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration (Days)</label>
              <input type="number" className="input-field" value={form.duration_days} onChange={e => f('duration_days', e.target.value)} />
            </div>
            <div>
              <label className="label">Departure Date *</label>
              <input type="date" className="input-field" value={form.departure_date} onChange={e => f('departure_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Return Date</label>
              <input type="date" className="input-field" value={form.return_date} onChange={e => f('return_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Transport</label>
              <select className="input-field" value={form.transport_type} onChange={e => f('transport_type', e.target.value)}>
                <option value="ac_bus">AC Bus</option>
                <option value="microbus">Microbus</option>
                <option value="launch">Launch/Boat</option>
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="private_car">Private Car</option>
              </select>
            </div>
            <div>
              <label className="label">Accommodation</label>
              <input className="input-field" value={form.accommodation} onChange={e => f('accommodation', e.target.value)} placeholder="Hotel name or type" />
            </div>
            <div>
              <label className="label">Meal Plan</label>
              <select className="input-field" value={form.meal_plan} onChange={e => f('meal_plan', e.target.value)}>
                <option value="without">Without Meals</option>
                <option value="with">With Meals</option>
                <option value="breakfast_only">Breakfast Only</option>
              </select>
            </div>
            <div>
              <label className="label">Price Per Person (৳)</label>
              <input type="number" className="input-field" value={form.price_per_person} onChange={e => f('price_per_person', e.target.value)} />
            </div>
            <div>
              <label className="label">Max Seats</label>
              <input type="number" className="input-field" value={form.max_seats} onChange={e => f('max_seats', e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="guide" checked={form.guide_included} onChange={e => f('guide_included', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="guide" className="text-sm font-medium text-neutral-700">Guide Included</label>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Highlights</label>
              <textarea className="input-field" rows={2} value={form.highlights} onChange={e => f('highlights', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Itinerary</label>
              <textarea className="input-field" rows={3} value={form.itinerary} onChange={e => f('itinerary', e.target.value)} placeholder="Day 1: ..., Day 2: ..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Create Tour'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
