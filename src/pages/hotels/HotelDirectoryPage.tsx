import { useState, useEffect } from 'react';
import { Building2, Plus, Search, MapPin, Phone, Star, Edit2, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

export interface Hotel {
  id: string;
  hotel_name: string;
  city: string;
  country: string;
  star_rating: number;
  address: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  distance_to_landmark: string;
  amenities: string[];
  standard_rate_bdt: number;
  hotel_rules?: string;
  cancellation_policy?: string;
  created_at?: string;
}

export const initialHotels: Hotel[] = [
  {
    id: 'h-1',
    hotel_name: 'Clock Tower Swissôtel',
    city: 'Makkah',
    country: 'Saudi Arabia',
    star_rating: 5,
    address: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah',
    contact_person: 'Sheikh Ibrahim',
    contact_phone: '+966 12 571 8000',
    contact_email: 'reservations.makkah@swissotel.com',
    distance_to_landmark: '50m from Haram (Abraj Al Bait)',
    amenities: ['Free WiFi', 'Breakfast Included', 'Elevator', 'Air Conditioning', 'Haram View', '24/7 Room Service'],
    standard_rate_bdt: 22000,
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Original Passport / NID required at check-in. Non-smoking room.',
    cancellation_policy: 'Free cancellation up to 72 hours before check-in. 1 night fee applies afterwards for late cancellation or no-show.',
  },
  {
    id: 'h-2',
    hotel_name: 'Hilton Convention Hotel',
    city: 'Makkah',
    country: 'Saudi Arabia',
    star_rating: 5,
    address: 'Jabal Omar, Ibrahim Al Khalil St, Makkah',
    contact_person: 'Mr. Tariq Al-Mansoor',
    contact_phone: '+966 12 537 1234',
    contact_email: 'makkah.convention@hilton.com',
    distance_to_landmark: '200m from Haram (Jabal Omar)',
    amenities: ['Free WiFi', 'Breakfast Included', 'Gym', 'Restaurant', 'Concierge', 'Haram View'],
    standard_rate_bdt: 19500,
    hotel_rules: 'Check-in: 15:00 | Check-out: 12:00. Government ID / Passport required.',
    cancellation_policy: 'Free cancellation up to 48 hours before arrival date.',
  },
  {
    id: 'h-3',
    hotel_name: 'The Oberoi Madinah',
    city: 'Madinah',
    country: 'Saudi Arabia',
    star_rating: 5,
    address: 'North Central Area, Madinah',
    contact_person: 'Sayed Farouq',
    contact_phone: '+966 14 828 2222',
    contact_email: 'reservations.madinah@oberoihotels.com',
    distance_to_landmark: 'Facing Prophet\'s Mosque (Women gate near)',
    amenities: ['Free WiFi', 'Breakfast Included', 'Luxury Protocol', 'Underground Parking', 'Haram View'],
    standard_rate_bdt: 26000,
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Non-refundable promotional rate.',
    cancellation_policy: '100% cancellation fee applies if cancelled within 14 days of stay.',
  },
  {
    id: 'h-4',
    hotel_name: 'Pullman Zamzam Madina',
    city: 'Madinah',
    country: 'Saudi Arabia',
    star_rating: 5,
    address: 'Amr Bin Al Aas Street, Central Area, Madinah',
    contact_person: 'Sheikh Fahad',
    contact_phone: '+966 14 821 0500',
    contact_email: 'h7450@accor.com',
    distance_to_landmark: '150m from Prophet\'s Mosque',
    amenities: ['Free WiFi', 'Breakfast Included', 'Business Center', 'International Dining', 'Family Suites'],
    standard_rate_bdt: 16500,
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Children welcome.',
    cancellation_policy: 'Free cancellation up to 7 days before check-in.',
  },
  {
    id: 'h-5',
    hotel_name: 'Elaf Kinda Hotel',
    city: 'Makkah',
    country: 'Saudi Arabia',
    star_rating: 4,
    address: 'Al Mesfelah, Ibrahim Al Khalil Street, Makkah',
    contact_person: 'Ahmed Mansoor',
    contact_phone: '+966 12 574 5555',
    contact_email: 'elafkinda@elafgroup.com',
    distance_to_landmark: '90m from King Fahd Gate (Haram)',
    amenities: ['Free WiFi', 'Breakfast Included', 'Elevator', '24/7 Desk', 'Express Check-out'],
    standard_rate_bdt: 12500,
    hotel_rules: 'Check-in: 16:00 | Check-out: 12:00.',
    cancellation_policy: 'Cancel up to 3 days prior without fee.',
  },
  {
    id: 'h-6',
    hotel_name: 'Sayeman Beach Resort',
    city: 'Cox\'s Bazar',
    country: 'Bangladesh',
    star_rating: 5,
    address: 'Marine Drive Road, Kolatoli, Cox\'s Bazar',
    contact_person: 'Zunaid Ahmed',
    contact_phone: '+880 1755 699901',
    contact_email: 'reservation@sayemanresort.com',
    distance_to_landmark: 'Beachfront directly facing Bay of Bengal',
    amenities: ['Free WiFi', 'Infinity Pool', 'Complimentary Breakfast', 'Sea View Balcony', 'Spa & Fitness'],
    standard_rate_bdt: 14000,
    hotel_rules: 'Check-in: 13:00 | Check-out: 11:00. NID / Passport copy required.',
    cancellation_policy: 'Non-refundable discount rate.',
  }
];

const emptyHotelForm = {
  hotel_name: '',
  city: 'Makkah',
  country: 'Saudi Arabia',
  star_rating: 5,
  address: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  distance_to_landmark: '',
  amenities_str: 'Free WiFi, Breakfast Included, Air Conditioning',
  standard_rate_bdt: 10000,
  hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Original Passport / NID required at check-in. Non-smoking room.',
  cancellation_policy: 'Free cancellation up to 72 hours before check-in. 1 night fee applies afterwards.',
};

export function HotelDirectoryPage() {
  const [hotels, setHotels] = useState<Hotel[]>(initialHotels);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [starFilter, setStarFilter] = useState<string>('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [form, setForm] = useState(emptyHotelForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadHotels();
  }, []);

  const loadHotels = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('hotels').select('*').order('hotel_name', { ascending: true });
      if (data && data.length > 0) {
        setHotels(data.map((item: any) => ({
          ...item,
          amenities: Array.isArray(item.amenities) 
            ? item.amenities 
            : typeof item.amenities === 'string' 
              ? item.amenities.split(',').map((s: string) => s.trim()) 
              : []
        })));
      } else {
        setHotels(initialHotels);
      }
    } catch (e) {
      console.error('Error fetching hotels:', e);
      setHotels(initialHotels);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.hotel_name || !form.city) {
      setError('Hotel Name and City are required.');
      return;
    }

    setSaving(true);
    setError('');

    const amenitiesList = form.amenities_str
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      hotel_name: form.hotel_name,
      city: form.city,
      country: form.country,
      star_rating: Number(form.star_rating),
      address: form.address,
      contact_person: form.contact_person,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email,
      distance_to_landmark: form.distance_to_landmark,
      amenities: amenitiesList,
      standard_rate_bdt: Number(form.standard_rate_bdt) || 0,
      hotel_rules: form.hotel_rules,
      cancellation_policy: form.cancellation_policy,
    };

    try {
      if (editingHotel) {
        const { error: err } = await supabase
          .from('hotels')
          .update(payload)
          .eq('id', editingHotel.id);
        
        if (err) {
          setHotels(prev => prev.map(h => h.id === editingHotel.id ? { ...h, ...payload } : h));
        } else {
          loadHotels();
        }
        setSuccess('Hotel info updated successfully!');
      } else {
        const { error: err } = await supabase
          .from('hotels')
          .insert([payload]);

        if (err) {
          const newHotel: Hotel = {
            id: 'h-' + Date.now(),
            ...payload
          };
          setHotels(prev => [newHotel, ...prev]);
        } else {
          loadHotels();
        }
        setSuccess('New Hotel registered successfully!');
      }

      setShowForm(false);
      setEditingHotel(null);
      setForm(emptyHotelForm);
    } catch (err: any) {
      setError(err.message || 'Failed to save hotel');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setForm({
      hotel_name: hotel.hotel_name || '',
      city: hotel.city || 'Makkah',
      country: hotel.country || 'Saudi Arabia',
      star_rating: hotel.star_rating || 4,
      address: hotel.address || '',
      contact_person: hotel.contact_person || '',
      contact_phone: hotel.contact_phone || '',
      contact_email: hotel.contact_email || '',
      distance_to_landmark: hotel.distance_to_landmark || '',
      amenities_str: hotel.amenities ? hotel.amenities.join(', ') : '',
      standard_rate_bdt: hotel.standard_rate_bdt || 0,
      hotel_rules: hotel.hotel_rules || '',
      cancellation_policy: hotel.cancellation_policy || '',
    });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this hotel record?')) return;
    try {
      await supabase.from('hotels').delete().eq('id', id);
    } catch (e) {
      console.log('Using local deletion');
    }
    setHotels(prev => prev.filter(h => h.id !== id));
    setSuccess('Hotel record removed.');
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const filteredHotels = hotels.filter(h => {
    const matchesSearch =
      h.hotel_name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()) ||
      h.distance_to_landmark.toLowerCase().includes(search.toLowerCase());
    
    const matchesCity = !cityFilter || h.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesStar = !starFilter || h.star_rating === Number(starFilter);

    return matchesSearch && matchesCity && matchesStar;
  });

  const cities = Array.from(new Set(hotels.map(h => h.city)));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditingHotel(null); setForm(emptyHotelForm); setShowForm(true); setError(''); }}
          className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> Add New Hotel
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search hotel name, city, or landmark distance..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-44" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          <option value="">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field sm:w-40" value={starFilter} onChange={e => setStarFilter(e.target.value)}>
          <option value="">All Ratings</option>
          <option value="5">5 Star ★★★★★</option>
          <option value="4">4 Star ★★★★</option>
          <option value="3">3 Star ★★★</option>
        </select>
      </div>

      {/* Hotel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-neutral-400 text-sm">
            Loading hotels directory...
          </div>
        ) : filteredHotels.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title="No Hotels Found"
              description="Register new hotels to manage bookings and package rates."
            />
          </div>
        ) : null}

        {filteredHotels.map(hotel => (
          <div key={hotel.id} className="bg-white rounded-3xl p-6 hover:shadow-xl transition-all duration-300 border border-slate-200/80 flex flex-col justify-between group">
            <div>
              {/* Card Header: Name, City & Stars */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full inline-flex mb-1.5">
                    <MapPin size={11} className="text-sky-600 shrink-0" />
                    <span>{hotel.city}</span>, {hotel.country}
                  </div>
                  <h3 className="font-heading font-extrabold text-slate-900 text-lg group-hover:text-primary-600 transition-colors leading-tight">
                    {hotel.hotel_name}
                  </h3>
                </div>

                <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-full shrink-0">
                  {Array.from({ length: hotel.star_rating }).map((_, i) => (
                    <Star key={i} size={11} className="text-amber-500 fill-amber-500" />
                  ))}
                  <span className="text-[10px] font-black text-amber-900 ml-1">{hotel.star_rating}★</span>
                </div>
              </div>

              {/* Distance to Haram / Landmark Pill */}
              {hotel.distance_to_landmark && (
                <div className="text-xs bg-slate-900 text-amber-300 px-3 py-1.5 rounded-xl inline-flex items-center gap-2 font-bold shadow-xs mb-3">
                  <span>🕋</span>
                  <span>{hotel.distance_to_landmark}</span>
                </div>
              )}

              {/* Contact Info (Compact) */}
              <div className="mt-2 space-y-2">
                {(hotel.contact_person || hotel.contact_phone) && (
                  <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-700 truncate">
                      <span className="font-bold text-slate-900">{hotel.contact_person || 'Manager'}</span>
                    </div>
                    {hotel.contact_phone && (
                      <div className="flex items-center gap-1 text-sky-700 font-mono font-bold bg-white px-2 py-0.5 rounded-md shadow-2xs border border-slate-200">
                        <Phone size={10} /> {hotel.contact_phone}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                    <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
                      {amenity}
                    </span>
                  ))}
                  {hotel.amenities.length > 4 && (
                    <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-lg font-bold border border-slate-200">
                      +{hotel.amenities.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Nightly Rate</span>
                <div className="text-base font-black text-slate-900 leading-tight">
                  {formatBDT(hotel.standard_rate_bdt)} <span className="text-[10px] font-normal text-slate-400">/ night</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(hotel)}
                  className="p-2 hover:bg-slate-100 text-slate-500 hover:text-sky-600 rounded-xl transition-colors"
                  title="Edit Hotel"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(hotel.id)}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                  title="Delete Hotel"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Hotel Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingHotel ? 'Edit Hotel Info' : 'Add New Hotel'} size="lg">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Hotel Name *</label>
              <input
                className="input-field font-semibold"
                placeholder="e.g. Clock Tower Swissôtel"
                value={form.hotel_name}
                onChange={e => f('hotel_name', e.target.value)}
              />
            </div>

            <div>
              <label className="label">City *</label>
              <input
                className="input-field font-semibold"
                placeholder="e.g. Makkah / Madinah / Dhaka"
                value={form.city}
                onChange={e => f('city', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Country</label>
              <input
                className="input-field"
                placeholder="e.g. Saudi Arabia / Bangladesh"
                value={form.country}
                onChange={e => f('country', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Star Category</label>
              <select className="input-field font-medium" value={form.star_rating} onChange={e => f('star_rating', Number(e.target.value))}>
                <option value={5}>5 Star ★★★★★</option>
                <option value={4}>4 Star ★★★★</option>
                <option value={3}>3 Star ★★★</option>
                <option value={2}>2 Star ★★</option>
                <option value={1}>1 Star ★</option>
              </select>
            </div>

            <div>
              <label className="label">Standard Nightly Rate (BDT)</label>
              <input
                type="number"
                className="input-field font-bold text-primary-600"
                placeholder="15000"
                value={form.standard_rate_bdt}
                onChange={e => f('standard_rate_bdt', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Distance to Haram / Landmark</label>
              <input
                className="input-field"
                placeholder="e.g. 50m from Haram / 150m from Masjid Nabawi / Beachfront"
                value={form.distance_to_landmark}
                onChange={e => f('distance_to_landmark', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Hotel Address</label>
              <textarea
                className="input-field text-xs"
                rows={2}
                placeholder="Full address of the hotel"
                value={form.address}
                onChange={e => f('address', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Contact Person</label>
              <input
                className="input-field"
                placeholder="Manager / Booking Agent Name"
                value={form.contact_person}
                onChange={e => f('contact_person', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Contact Phone</label>
              <input
                className="input-field"
                placeholder="+966 12 571 8000"
                value={form.contact_phone}
                onChange={e => f('contact_phone', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Contact Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="reservations@hotel.com"
                value={form.contact_email}
                onChange={e => f('contact_email', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Amenities (Comma separated)</label>
              <input
                className="input-field"
                placeholder="Free WiFi, Breakfast Included, Haram View, Air Conditioning"
                value={form.amenities_str}
                onChange={e => f('amenities_str', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 border-t border-neutral-100 pt-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Hotel Rules & Cancellation Policy (Auto-filled on Booking)</h4>
            </div>

            <div className="sm:col-span-2">
              <label className="label font-bold text-neutral-700">Hotel Rules</label>
              <textarea
                className="input-field text-xs"
                rows={2}
                placeholder="e.g. Check-in: 14:00 | Check-out: 12:00. Passport required."
                value={form.hotel_rules}
                onChange={e => f('hotel_rules', e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label font-bold text-neutral-700">Cancellation Policy</label>
              <textarea
                className="input-field text-xs"
                rows={2}
                placeholder="e.g. Free cancellation up to 72 hours before check-in. 1 night penalty fee for late cancellation."
                value={form.cancellation_policy}
                onChange={e => f('cancellation_policy', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : editingHotel ? 'Update Hotel' : 'Save Hotel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
