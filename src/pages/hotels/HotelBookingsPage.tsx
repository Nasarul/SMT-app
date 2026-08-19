import { useState, useEffect } from 'react';
import { Building2, Plus, Search, Calendar, Users, FileText, CheckCircle, AlertCircle, Edit2, Trash2, Printer, MapPin, DollarSign, ShieldCheck, ScrollText, AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, getStatusColor } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import { initialHotels } from './HotelDirectoryPage';

export interface HotelBooking {
  id: string;
  booking_reference: string;          // Booking ID
  hotel_confirmation_id: string;       // Hotel Confirmation ID
  customer_name: string;
  customer_phone: string;
  customer_id?: string;
  nationality: string;                 // Nationality
  adults_count: number;                // Adult count
  children_count: number;              // Child count
  hotel_name: string;
  hotel_address: string;               // Hotel Address
  city: string;
  room_type: 'Single' | 'Double' | 'Triple' | 'Quad' | 'Suite' | 'Family';
  rooms_count: number;
  room_details: string;                // Room Details
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  meal_plan: string;
  cost_price: number;
  total_fare: number;
  paid_amount: number;
  profit: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  special_requests?: string;
  hotel_rules?: string;                // Hotel Rules
  cancellation_policy?: string;        // Cancellation Policy
  created_at?: string;
}

const initialBookings: HotelBooking[] = [
  {
    id: 'hb-101',
    booking_reference: 'BK-88301',
    hotel_confirmation_id: 'CNF-SWISS-9921',
    customer_name: 'Mahmudur Rahman',
    customer_phone: '01711223344',
    nationality: 'Bangladeshi',
    adults_count: 2,
    children_count: 1,
    hotel_name: 'Clock Tower Swissôtel',
    hotel_address: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah',
    city: 'Makkah',
    room_type: 'Double',
    rooms_count: 1,
    room_details: 'Deluxe Haram View Double Room, High Floor',
    check_in_date: '2025-09-10',
    check_out_date: '2025-09-17',
    total_nights: 7,
    meal_plan: 'Breakfast Included',
    cost_price: 130000,
    total_fare: 154000,
    paid_amount: 154000,
    profit: 24000,
    status: 'confirmed',
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Original Passport / NID required at check-in. Non-smoking room.',
    cancellation_policy: 'Free cancellation up to 72 hours before check-in. 1 night fee applies afterwards for late cancellation or no-show.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'hb-102',
    booking_reference: 'BK-88302',
    hotel_confirmation_id: 'CNF-HIL-5542',
    customer_name: 'Farhana Yasmin',
    customer_phone: '01822334455',
    nationality: 'Bangladeshi',
    adults_count: 3,
    children_count: 0,
    hotel_name: 'Hilton Convention Hotel',
    hotel_address: 'Jabal Omar, Ibrahim Al Khalil St, Makkah',
    city: 'Makkah',
    room_type: 'Triple',
    rooms_count: 1,
    room_details: 'Executive Triple Room, City View',
    check_in_date: '2025-10-01',
    check_out_date: '2025-10-08',
    total_nights: 7,
    meal_plan: 'Breakfast Included',
    cost_price: 110000,
    total_fare: 135000,
    paid_amount: 50000,
    profit: 25000,
    status: 'pending',
    hotel_rules: 'Check-in: 15:00 | Check-out: 12:00. Government ID required.',
    cancellation_policy: 'Free cancellation up to 48 hours before check-in.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'hb-103',
    booking_reference: 'BK-88303',
    hotel_confirmation_id: 'CNF-OBE-1120',
    customer_name: 'Anwarul Kabir',
    customer_phone: '01933445566',
    nationality: 'Bangladeshi',
    adults_count: 2,
    children_count: 2,
    hotel_name: 'The Oberoi Madinah',
    hotel_address: 'North Central Area, Madinah',
    city: 'Madinah',
    room_type: 'Suite',
    rooms_count: 1,
    room_details: 'Royal Haram View Family Suite with lounge',
    check_in_date: '2025-08-15',
    check_out_date: '2025-08-20',
    total_nights: 5,
    meal_plan: 'Breakfast Included',
    cost_price: 180000,
    total_fare: 210000,
    paid_amount: 210000,
    profit: 30000,
    status: 'completed',
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Luxury protocol.',
    cancellation_policy: 'Non-refundable booking.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'hb-104',
    booking_reference: 'BK-88304',
    hotel_confirmation_id: 'CNF-PUL-8821',
    customer_name: 'Kamrul Hassan',
    customer_phone: '01511223344',
    nationality: 'Bangladeshi',
    adults_count: 2,
    children_count: 0,
    hotel_name: 'Pullman Zamzam Madina',
    hotel_address: 'Amr Bin Al Ghas St, Al Badaah, Madinah',
    city: 'Madinah',
    room_type: 'Double',
    rooms_count: 1,
    room_details: 'Classic Twin Room, Walking distance to Prophet Mosque',
    check_in_date: '2025-09-20',
    check_out_date: '2025-09-25',
    total_nights: 5,
    meal_plan: 'Breakfast Included',
    cost_price: 65000,
    total_fare: 78000,
    paid_amount: 78000,
    profit: 13000,
    status: 'confirmed',
    hotel_rules: 'Check-in: 14:00 | Check-out: 12:00.',
    cancellation_policy: 'Free cancellation up to 7 days before check-in.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'hb-105',
    booking_reference: 'BK-88305',
    hotel_confirmation_id: 'CNF-SEA-3391',
    customer_name: 'Tariqul Islam',
    customer_phone: '01611223344',
    nationality: 'Bangladeshi',
    adults_count: 2,
    children_count: 1,
    hotel_name: 'Sayeman Beach Resort',
    hotel_address: 'Marine Drive Road, Kolatoli, Cox\'s Bazar',
    city: 'Cox\'s Bazar',
    room_type: 'Double',
    rooms_count: 1,
    room_details: 'Infinity Sea View Deluxe Room with Balcony',
    check_in_date: '2025-08-01',
    check_out_date: '2025-08-04',
    total_nights: 3,
    meal_plan: 'Breakfast Included',
    cost_price: 36000,
    total_fare: 42000,
    paid_amount: 42000,
    profit: 6000,
    status: 'completed',
    created_at: new Date().toISOString(),
  }
];

const emptyBookingForm = {
  booking_reference: '',
  hotel_confirmation_id: '',
  customer_name: '',
  customer_phone: '',
  customer_id: '',
  nationality: 'Bangladeshi',
  adults_count: 2,
  children_count: 0,
  hotel_name: 'Clock Tower Swissôtel',
  hotel_address: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah',
  city: 'Makkah',
  room_type: 'Double' as HotelBooking['room_type'],
  rooms_count: 1,
  room_details: 'Standard Deluxe Room with City/Haram View',
  check_in_date: new Date().toISOString().split('T')[0],
  check_out_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
  meal_plan: 'Breakfast Included',
  cost_price: 100000,
  total_fare: 120000,
  paid_amount: 120000,
  status: 'confirmed' as HotelBooking['status'],
  special_requests: '',
  hotel_rules: 'Check-in: 14:00 | Check-out: 12:00. Original Passport / NID required at check-in. Non-smoking room.',
  cancellation_policy: 'Free cancellation up to 72 hours before check-in. 1 night fee applies afterwards.',
  guests: [] as { id: string; name: string; age_group: string; room_no: string }[],
};

export function HotelBookingsPage() {
  const { company } = useSettings();
  const [bookings, setBookings] = useState<HotelBooking[]>(initialBookings);
  const [customers, setCustomers] = useState<any[]>([]);
  const [hotelsList, setHotelsList] = useState<any[]>(initialHotels);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null);
  const [form, setForm] = useState(emptyBookingForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'guests' | 'finance'>('details');

  const [selectedVoucher, setSelectedVoucher] = useState<HotelBooking | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  useEffect(() => {
    loadBookingsAndOptions();
  }, []);

  const loadBookingsAndOptions = async () => {
    setLoading(true);
    try {
      const [bookingsRes, customersRes, hotelsRes] = await Promise.all([
        supabase.from('hotel_bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, mobile, nationality'),
        supabase.from('hotels').select('*').order('hotel_name', { ascending: true })
      ]);

      if (customersRes.data) setCustomers(customersRes.data);
      if (hotelsRes.data && hotelsRes.data.length > 0) {
        setHotelsList(hotelsRes.data);
      } else {
        setHotelsList(initialHotels);
      }

      if (bookingsRes.data && bookingsRes.data.length > 0) {
        setBookings(bookingsRes.data);
      } else {
        setBookings(initialBookings);
      }
    } catch (e) {
      console.error('Error loading hotel bookings:', e);
      setHotelsList(initialHotels);
      setBookings(initialBookings);
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const handleCustomerSelect = (cust: any) => {
    setForm(prev => ({
      ...prev,
      customer_id: cust.id,
      customer_name: cust.full_name,
      customer_phone: cust.mobile || prev.customer_phone,
      nationality: cust.nationality || prev.nationality || 'Bangladeshi'
    }));
  };

  const handleHotelSelect = (hotelName: string) => {
    const found = hotelsList.find(h => h.hotel_name === hotelName);
    if (found) {
      setForm(prev => ({
        ...prev,
        hotel_name: hotelName,
        city: found.city || prev.city,
        hotel_address: found.address || prev.hotel_address,
        hotel_rules: found.hotel_rules || prev.hotel_rules,
        cancellation_policy: found.cancellation_policy || prev.cancellation_policy,
        cost_price: found.standard_rate_bdt || prev.cost_price,
      }));
    } else {
      setForm(prev => ({
        ...prev,
        hotel_name: hotelName
      }));
    }
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.hotel_name || !form.check_in_date || !form.check_out_date) {
      setError('Customer name, hotel, check-in, and check-out dates are required.');
      return;
    }

    setSaving(true);
    setError('');

    const nights = calculateNights(form.check_in_date, form.check_out_date);
    const cost = Number(form.cost_price) || 0;
    const fare = Number(form.total_fare) || 0;
    const paid = Number(form.paid_amount) || 0;
    const profit = fare - cost;
    const refCode = form.booking_reference || editingBooking?.booking_reference || `BK-${Math.floor(10000 + Math.random() * 90000)}`;
    const cnfCode = form.hotel_confirmation_id || editingBooking?.hotel_confirmation_id || '';

    const payload: HotelBooking = {
      id: editingBooking ? editingBooking.id : 'hb-' + Date.now(),
      booking_reference: refCode,
      hotel_confirmation_id: cnfCode,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_id: form.customer_id || undefined,
      nationality: form.nationality || 'Bangladeshi',
      adults_count: Number(form.adults_count) || 1,
      children_count: Number(form.children_count) || 0,
      hotel_name: form.hotel_name,
      hotel_address: form.hotel_address,
      city: form.city,
      room_type: form.room_type,
      rooms_count: Number(form.rooms_count) || 1,
      room_details: form.guests && form.guests.length > 0 
        ? `${form.room_details}\n\nGuest Assignment:\n${form.guests.map((g: any) => `${g.name} (${g.age_group}) ➔ ${g.room_no}`).join('\n')}`
        : form.room_details,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      total_nights: nights,
      meal_plan: form.meal_plan,
      cost_price: cost,
      total_fare: fare,
      paid_amount: paid,
      profit: profit,
      status: form.status,
      special_requests: form.special_requests,
      hotel_rules: form.hotel_rules,
      cancellation_policy: form.cancellation_policy,
    };

    try {
      if (editingBooking) {
        const { error: err } = await supabase
          .from('hotel_bookings')
          .update(payload)
          .eq('id', editingBooking.id);

        if (err) {
          setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...b, ...payload } : b));
        } else {
          loadBookingsAndOptions();
        }
        setSuccess('Hotel reservation updated successfully!');
      } else {
        const { error: err } = await supabase
          .from('hotel_bookings')
          .insert([payload]);

        if (err) {
          setBookings(prev => [payload, ...prev]);
        } else {
          loadBookingsAndOptions();
        }
        setSuccess('New Hotel reservation created successfully!');
      }

      setShowForm(false);
      setEditingBooking(null);
      setForm(emptyBookingForm);
    } catch (err: any) {
      setError(err.message || 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (booking: HotelBooking) => {
    setEditingBooking(booking);
    setForm({
      booking_reference: booking.booking_reference || '',
      hotel_confirmation_id: booking.hotel_confirmation_id || '',
      customer_name: booking.customer_name || '',
      customer_phone: booking.customer_phone || '',
      customer_id: booking.customer_id || '',
      nationality: booking.nationality || 'Bangladeshi',
      adults_count: booking.adults_count || 2,
      children_count: booking.children_count || 0,
      hotel_name: booking.hotel_name || '',
      hotel_address: booking.hotel_address || '',
      city: booking.city || 'Makkah',
      room_type: booking.room_type || 'Double',
      rooms_count: booking.rooms_count || 1,
      room_details: booking.room_details || '',
      check_in_date: booking.check_in_date || '',
      check_out_date: booking.check_out_date || '',
      meal_plan: booking.meal_plan || 'Breakfast Included',
      cost_price: booking.cost_price || 0,
      total_fare: booking.total_fare || 0,
      paid_amount: booking.paid_amount || 0,
      status: booking.status || 'confirmed',
      special_requests: booking.special_requests || '',
      hotel_rules: booking.hotel_rules || '',
      cancellation_policy: booking.cancellation_policy || '',
      guests: [],
    });
    setShowForm(true);
    setError('');
    setActiveTab('details');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel / delete this booking?')) return;
    try {
      await supabase.from('hotel_bookings').delete().eq('id', id);
    } catch (e) {
      console.log('Local delete');
    }
    setBookings(prev => prev.filter(b => b.id !== id));
    setSuccess('Booking deleted.');
  };

  const openVoucher = (booking: HotelBooking) => {
    setSelectedVoucher(booking);
    setShowVoucherModal(true);
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const handleGuestsUpdate = (newGuests: any[]) => {
    const adults = newGuests.filter(g => g.age_group === 'Adult').length;
    const children = newGuests.filter(g => g.age_group === 'Child' || g.age_group === 'Infant').length;
    setForm(prev => ({ ...prev, guests: newGuests, adults_count: adults, children_count: children }));
  };

  const syncGuestsWithCount = (type: 'Adult' | 'Child', newCount: number) => {
    setForm(prev => {
      let typeGuests = (prev.guests || []).filter(g => type === 'Adult' ? g.age_group === 'Adult' : (g.age_group === 'Child' || g.age_group === 'Infant'));
      const otherGuests = (prev.guests || []).filter(g => type === 'Adult' ? g.age_group !== 'Adult' : (g.age_group === 'Adult'));
      
      if (newCount > typeGuests.length) {
        const diff = newCount - typeGuests.length;
        for (let i = 0; i < diff; i++) {
          typeGuests.push({ id: Date.now().toString() + Math.random(), name: '', age_group: type, room_no: 'Room 1' });
        }
      } else if (newCount < typeGuests.length) {
        typeGuests = typeGuests.slice(0, newCount);
      }
      
      const newGuests = type === 'Adult' ? [...typeGuests, ...otherGuests] : [...otherGuests, ...typeGuests];
      return { ...prev, [type === 'Adult' ? 'adults_count' : 'children_count']: newCount, guests: newGuests };
    });
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      b.hotel_name.toLowerCase().includes(search.toLowerCase()) ||
      b.booking_reference.toLowerCase().includes(search.toLowerCase()) ||
      (b.hotel_confirmation_id && b.hotel_confirmation_id.toLowerCase().includes(search.toLowerCase())) ||
      b.customer_phone.includes(search);

    const matchesStatus = !statusFilter || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalBookingsCount = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_fare || 0), 0);
  const totalProfit = bookings.reduce((sum, b) => sum + (b.profit || 0), 0);

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditingBooking(null);
            setForm({
              ...emptyBookingForm,
              booking_reference: `BK-${Math.floor(10000 + Math.random() * 90000)}`,
              hotel_confirmation_id: '',
              guests: [{ id: Date.now().toString(), name: '', age_group: 'Adult', room_no: 'Room 1' }]
            });
            setShowForm(true);
            setError('');
            setActiveTab('details');
          }}
          className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> New Hotel Reservation
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-4 border-l-4 border-l-primary-500">
          <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Total Hotel Bookings</div>
            <div className="text-xl font-black text-neutral-800">{totalBookingsCount}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 border-l-4 border-l-success-500">
          <div className="w-10 h-10 bg-success-50 text-success-600 rounded-xl flex items-center justify-center font-bold">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Total Revenue</div>
            <div className="text-xl font-black text-neutral-800">{formatBDT(totalRevenue)}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4 border-l-4 border-l-gold-500">
          <div className="w-10 h-10 bg-gold-50 text-gold-700 rounded-xl flex items-center justify-center font-bold">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-400">Net Hotel Profit</div>
            <div className="text-xl font-black text-neutral-800">{formatBDT(totalProfit)}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by Booking ID, Confirmation ID, customer, hotel, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="table-header text-left">Booking & Guest</th>
                <th className="table-header text-left">Hotel & Room</th>
                <th className="table-header text-left">Stay Details</th>
                <th className="table-header text-right">Financials</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400 text-sm">Loading bookings...</td>
                </tr>
              )}
              {!loading && filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={Building2} title="No Hotel Bookings Found" description="Create a new hotel reservation for your customers." />
                  </td>
                </tr>
              )}
              {filteredBookings.map(b => (
                <tr key={b.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="table-cell">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">#{b.booking_reference}</span>
                      <span className="font-bold text-neutral-800 text-xs mt-0.5">{b.customer_name}</span>
                      <Badge variant={getStatusColor(b.status) as any} className="text-[9px] px-1.5 py-0.5 uppercase">
                        {b.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                      <Building2 size={13} className="text-primary-500 shrink-0" /> {b.hotel_name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold mt-1.5 bg-neutral-100 w-fit px-2 py-0.5 rounded-md">
                      {b.rooms_count}x {b.room_type} • {b.meal_plan}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {b.city} {b.hotel_confirmation_id && `• CNF: ${b.hotel_confirmation_id}`}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                      <Calendar size={13} className="text-neutral-400" />
                      {formatDate(b.check_in_date)} <span className="text-[10px] text-neutral-400 font-normal">to</span> {formatDate(b.check_out_date)}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-bold mt-1.5 flex items-center gap-2">
                      <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">🌙 {b.total_nights} Night{b.total_nights > 1 ? 's' : ''}</span>
                      <span className="bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded">👥 {b.adults_count} Adult(s) {b.children_count ? `& ${b.children_count} Child` : ''}</span>
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="font-black text-sm text-neutral-900">{formatBDT(b.total_fare)}</div>
                    <div className="text-[10px] font-bold text-success-600 mt-0.5 bg-success-50 inline-block px-1.5 py-0.5 rounded">Profit: {formatBDT(b.profit)}</div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openVoucher(b)}
                        className="p-1.5 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                        title="View Hotel Confirmation Voucher"
                      >
                        <FileText size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(b)}
                        className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                        title="Edit Reservation"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 hover:bg-error-50 text-neutral-400 hover:text-error-600 rounded-lg transition-colors"
                        title="Delete Reservation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Hotel Booking Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingBooking ? 'Edit Hotel Reservation' : 'New Hotel Reservation'} size="lg">
        <div className="p-5 space-y-5">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex border-b border-neutral-200 gap-6 mb-4 mt-2">
            <button 
              type="button"
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('details')}
            >
              1. Hotel & Dates
            </button>
            <button 
              type="button"
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'guests' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('guests')}
            >
              2. Guest List
            </button>
            <button 
              type="button"
              className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'finance' ? 'border-primary-600 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
              onClick={() => setActiveTab('finance')}
            >
              3. Pricing & Rules
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Section 1: Reservation Identification & Status */}
              <div className="bg-primary-50/40 p-4 rounded-xl border border-primary-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-primary-900 uppercase tracking-widest flex items-center gap-1.5">
                <FileText size={14} className="text-primary-600" /> 1. Reservation Identification & Status
              </h4>
              <span className="text-[10px] bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">System Ref</span>
            </div>

            {/* Quick Customer Select */}
            {customers.length > 0 && !editingBooking && (
              <div>
                <label className="label text-primary-900 font-bold mb-1 text-xs">Select Registered Customer (Auto-fills guest info)</label>
                <select
                  className="input-field text-xs font-medium bg-white"
                  onChange={e => {
                    const cust = customers.find(c => c.id === e.target.value);
                    if (cust) handleCustomerSelect(cust);
                  }}
                >
                  <option value="">-- Choose from Customer Database --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.mobile})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label font-bold text-neutral-700">Booking ID (Auto)</label>
                <input
                  className="input-field font-mono font-bold text-primary-700 bg-neutral-100 cursor-not-allowed"
                  placeholder="Auto-generated"
                  value={form.booking_reference}
                  readOnly
                  disabled
                />
              </div>
              <div>
                <label className="label font-bold text-neutral-700">Hotel Confirmation ID</label>
                <input
                  className="input-field font-mono font-bold text-teal-700 bg-white"
                  placeholder="e.g. CNF-SWISS-9921"
                  value={form.hotel_confirmation_id}
                  onChange={e => f('hotel_confirmation_id', e.target.value)}
                />
              </div>
              <div>
                <label className="label font-bold text-neutral-700">Booking Status *</label>
                <select className="input-field font-semibold bg-white" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="space-y-5">
              {/* Section 2: Guest Information */}
              <div className="card p-4 border border-neutral-200 space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2">
              <Users size={14} className="text-primary-600" /> 2. Guest Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Customer Full Name *</label>
                <input
                  className="input-field font-semibold"
                  placeholder="e.g. Mahmudur Rahman"
                  value={form.customer_name}
                  onChange={e => f('customer_name', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Customer Phone</label>
                <input
                  className="input-field"
                  placeholder="017XXXXXXXX"
                  value={form.customer_phone}
                  onChange={e => f('customer_phone', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Nationality</label>
                <input
                  className="input-field"
                  placeholder="e.g. Bangladeshi"
                  value={form.nationality}
                  onChange={e => f('nationality', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Adults Count</label>
                <input
                  type="number"
                  min="1"
                  className="input-field font-bold"
                  placeholder="2"
                  value={form.adults_count}
                  onChange={e => syncGuestsWithCount('Adult', parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="label">Children Count</label>
                <input
                  type="number"
                  min="0"
                  className="input-field font-bold"
                  placeholder="0"
                  value={form.children_count}
                  onChange={e => syncGuestsWithCount('Child', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Guest Assignment Grid */}
            <div className="mt-5 border border-neutral-200 rounded-xl overflow-hidden">
              <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-700">Guest Room Assignment (Optional)</span>
                <button
                  type="button"
                  onClick={() => handleGuestsUpdate([...(form.guests || []), { id: Date.now().toString(), name: '', age_group: 'Adult', room_no: 'Room 1' }])}
                  className="text-[10px] font-bold bg-white border border-neutral-300 text-neutral-600 px-2 py-1 rounded hover:bg-neutral-100 flex items-center gap-1"
                >
                  <Plus size={12} /> Add Extra Guest
                </button>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-100/50 text-[10px] text-neutral-500 uppercase">
                      <th className="p-2 font-bold w-1/2">Guest Name</th>
                      <th className="p-2 font-bold w-1/4">Age Group</th>
                      <th className="p-2 font-bold w-1/4">Assign to Room</th>
                      <th className="p-2 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.guests || []).map((guest: any, index: number) => (
                      <tr key={guest.id} className="border-t border-neutral-100">
                        <td className="p-2">
                          <input
                            className="w-full text-xs p-1.5 border border-neutral-200 rounded outline-none focus:border-primary-500"
                            placeholder="Guest Name"
                            value={guest.name}
                            onChange={e => {
                              const newGuests = [...form.guests];
                              newGuests[index].name = e.target.value;
                              handleGuestsUpdate(newGuests);
                              if (index === 0 && !form.customer_name) f('customer_name', e.target.value);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            className="w-full text-xs p-1.5 border border-neutral-200 rounded outline-none"
                            value={guest.age_group}
                            onChange={e => {
                              const newGuests = [...form.guests];
                              newGuests[index].age_group = e.target.value;
                              handleGuestsUpdate(newGuests);
                            }}
                          >
                            <option value="Adult">Adult</option>
                            <option value="Child">Child</option>
                            <option value="Infant">Infant</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            className="w-full text-xs p-1.5 border border-neutral-200 rounded outline-none font-bold text-primary-700 bg-primary-50/50"
                            value={guest.room_no}
                            onChange={e => {
                              const newGuests = [...form.guests];
                              newGuests[index].room_no = e.target.value;
                              handleGuestsUpdate(newGuests);
                            }}
                          >
                            {Array.from({ length: Number(form.rooms_count) || 1 }).map((_, i) => (
                              <option key={i} value={`Room ${i + 1}`}>Room {i + 1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const newGuests = form.guests.filter((_, i) => i !== index);
                              handleGuestsUpdate(newGuests);
                            }}
                            className="text-error-500 hover:bg-error-50 p-1 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!form.guests || form.guests.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-xs text-neutral-400">
                          No guests added to assignment grid.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="space-y-5">
            {/* Section 3: Hotel & Accommodation Details */}
              <div className="card p-4 border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                <Building2 size={14} className="text-teal-600" /> 3. Hotel & Accommodation Details
              </h4>
              <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">Auto-Fills Rules & Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Hotel Name * (Select from Directory)</label>
                {hotelsList.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      className="input-field font-semibold flex-1"
                      value={form.hotel_name}
                      onChange={e => handleHotelSelect(e.target.value)}
                    >
                      {hotelsList.map(h => (
                        <option key={h.id} value={h.hotel_name}>{h.hotel_name} ({h.city})</option>
                      ))}
                    </select>
                    <input
                      className="input-field flex-1"
                      placeholder="Or type hotel name..."
                      value={form.hotel_name}
                      onChange={e => f('hotel_name', e.target.value)}
                    />
                  </div>
                ) : (
                  <input
                    className="input-field font-semibold"
                    placeholder="e.g. Clock Tower Swissôtel Makkah"
                    value={form.hotel_name}
                    onChange={e => f('hotel_name', e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="label">City</label>
                <input
                  className="input-field font-semibold"
                  placeholder="Makkah / Madinah / Dhaka"
                  value={form.city}
                  onChange={e => f('city', e.target.value)}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="label">Hotel Address</label>
                <input
                  className="input-field"
                  placeholder="e.g. Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah"
                  value={form.hotel_address}
                  onChange={e => f('hotel_address', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Room Category</label>
                <select className="input-field font-medium" value={form.room_type} onChange={e => f('room_type', e.target.value)}>
                  <option value="Single">Single Room</option>
                  <option value="Double">Double / Twin Room</option>
                  <option value="Triple">Triple Room</option>
                  <option value="Quad">Quad Room</option>
                  <option value="Suite">Suite</option>
                  <option value="Family">Family Room</option>
                </select>
              </div>

              <div>
                <label className="label">Number of Rooms</label>
                <input
                  type="number"
                  min="1"
                  className="input-field font-bold"
                  value={form.rooms_count}
                  onChange={e => f('rooms_count', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Meal Plan</label>
                <select className="input-field" value={form.meal_plan} onChange={e => f('meal_plan', e.target.value)}>
                  <option value="Breakfast Included">Breakfast Included</option>
                  <option value="Room Only">Room Only (No Meals)</option>
                  <option value="Half Board (Breakfast & Dinner)">Half Board (Breakfast & Dinner)</option>
                  <option value="Full Board (All Meals)">Full Board (All Meals)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="label">Room Details (Description / Views)</label>
                <input
                  className="input-field"
                  placeholder="e.g. Deluxe Haram View Double Room, 12th Floor, King Bed"
                  value={form.room_details}
                  onChange={e => f('room_details', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Stay Dates & Duration */}
          <div className="card p-4 border border-neutral-200 space-y-3 bg-neutral-50/50">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-200 pb-2">
              <Calendar size={14} className="text-gold-600" /> 4. Stay Dates & Duration
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label font-bold text-neutral-700">Check-In Date *</label>
                <input
                  type="date"
                  className="input-field font-medium bg-white"
                  value={form.check_in_date}
                  onChange={e => f('check_in_date', e.target.value)}
                />
              </div>

              <div>
                <label className="label font-bold text-neutral-700">Check-Out Date *</label>
                <input
                  type="date"
                  className="input-field font-medium bg-white"
                  value={form.check_out_date}
                  onChange={e => f('check_out_date', e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-neutral-200 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-600">Calculated Stay Duration:</span>
                <span className="text-sm font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-md border border-primary-100">
                  {calculateNights(form.check_in_date, form.check_out_date)} Night(s)
                </span>
              </div>
            </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-5">
            {/* Section 5: Pricing & Financials */}
              <div className="card p-4 border border-neutral-200 space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2">
              <DollarSign size={14} className="text-success-600" /> 5. Pricing & Financials
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">Cost Price (BDT)</label>
                <input
                  type="number"
                  className="input-field font-medium"
                  placeholder="100000"
                  value={form.cost_price}
                  onChange={e => f('cost_price', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Selling Fare (BDT) *</label>
                <input
                  type="number"
                  className="input-field font-bold text-primary-600"
                  placeholder="120000"
                  value={form.total_fare}
                  onChange={e => f('total_fare', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Paid Amount (BDT)</label>
                <input
                  type="number"
                  className="input-field font-semibold text-success-600"
                  placeholder="120000"
                  value={form.paid_amount}
                  onChange={e => f('paid_amount', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Net Profit (BDT)</label>
                <div className="input-field bg-neutral-100 font-bold text-emerald-700 flex items-center">
                  {formatBDT((Number(form.total_fare) || 0) - (Number(form.cost_price) || 0))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Rules, Policies & Notes */}
          <div className="card p-4 border border-neutral-200 space-y-3">
            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-neutral-100 pb-2">
              <ScrollText size={14} className="text-secondary-600" /> 6. Hotel Rules, Policies & Notes
            </h4>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="label font-bold text-neutral-700">Hotel Rules & Regulations</label>
                <textarea
                  className="input-field text-xs"
                  rows={2}
                  placeholder="e.g. Standard Check-in time: 14:00. Check-out time: 12:00. Passport required."
                  value={form.hotel_rules}
                  onChange={e => f('hotel_rules', e.target.value)}
                />
              </div>

              <div>
                <label className="label font-bold text-neutral-700">Cancellation Policy</label>
                <textarea
                  className="input-field text-xs"
                  rows={2}
                  placeholder="e.g. Free cancellation up to 72 hours before check-in. 1 night penalty fee for late cancellation."
                  value={form.cancellation_policy}
                  onChange={e => f('cancellation_policy', e.target.value)}
                />
              </div>

              <div>
                <label className="label">Special Requests / Notes</label>
                <textarea
                  className="input-field text-xs"
                  rows={2}
                  placeholder="e.g. Near Haram, quiet room, late check-in..."
                  value={form.special_requests}
                  onChange={e => f('special_requests', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Submit / Cancel Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : editingBooking ? 'Update Reservation' : 'Create Reservation'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Hotel Voucher Printable Modal */}
      {selectedVoucher && (
        <Modal isOpen={showVoucherModal} onClose={() => setShowVoucherModal(false)} title="Hotel Confirmation Voucher" size="lg">
          <div className="p-6 space-y-6">
            <div className="border-2 border-primary-600 p-6 rounded-2xl bg-white shadow-sm space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-200 pb-4">
                <div>
                  <h2 className="text-xl font-black text-primary-700 uppercase tracking-tight">{company.name}</h2>
                  <p className="text-xs text-neutral-500 font-bold">{company.tagline || 'Travel & Accommodation Management'}</p>
                  <p className="text-xs text-neutral-400 mt-1">Contact: {company.phone || '+880 1700-000000'} | {company.email || 'info@agency.com'}</p>
                </div>
                <div className="text-right">
                  <div className="bg-primary-50 text-primary-700 border border-primary-200 text-xs font-black px-3 py-1 rounded-lg inline-block uppercase">
                    Hotel Voucher
                  </div>
                  <div className="text-xs font-mono font-bold text-neutral-800 mt-2">
                    Booking ID: <span className="text-primary-700">{selectedVoucher.booking_reference}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-teal-700">
                    Hotel CNF ID: {selectedVoucher.hotel_confirmation_id || 'N/A'}
                  </div>
                  <div className="text-[10px] text-neutral-400">Issued: {new Date().toLocaleDateString()}</div>
                </div>
              </div>

              {/* Guest & Hotel Info */}
              <div className="grid grid-cols-2 gap-4 bg-neutral-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Guest Information</span>
                  <div className="font-bold text-neutral-800 text-sm mt-1">{selectedVoucher.customer_name}</div>
                  {selectedVoucher.customer_phone && <div className="text-neutral-600 mt-0.5">Phone: {selectedVoucher.customer_phone}</div>}
                  <div className="text-neutral-600 mt-0.5">
                    Guests: <strong>{selectedVoucher.adults_count || 1} Adult(s)</strong>{selectedVoucher.children_count ? `, ${selectedVoucher.children_count} Child` : ''}
                  </div>
                  {selectedVoucher.nationality && <div className="text-neutral-600">Nationality: {selectedVoucher.nationality}</div>}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Hotel Details</span>
                  <div className="font-bold text-neutral-800 text-sm mt-1">{selectedVoucher.hotel_name}</div>
                  <div className="text-neutral-600 mt-0.5">City: <strong>{selectedVoucher.city}</strong></div>
                  {selectedVoucher.hotel_address && <div className="text-neutral-500 mt-0.5">Address: {selectedVoucher.hotel_address}</div>}
                </div>
              </div>

              {/* Room & Stay Details Table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-neutral-100 font-bold text-neutral-700 text-left">
                    <tr>
                      <th className="p-3">Check-In</th>
                      <th className="p-3">Check-Out</th>
                      <th className="p-3 text-center">Duration</th>
                      <th className="p-3 text-center">Room & Details</th>
                      <th className="p-3 text-right">Meal Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 font-medium">
                      <td className="p-3">{formatDate(selectedVoucher.check_in_date)}</td>
                      <td className="p-3">{formatDate(selectedVoucher.check_out_date)}</td>
                      <td className="p-3 text-center font-bold">{selectedVoucher.total_nights} Night(s)</td>
                      <td className="p-3 text-center">
                        <div className="font-bold">{selectedVoucher.rooms_count} x {selectedVoucher.room_type}</div>
                        {selectedVoucher.room_details && <div className="text-[10px] text-neutral-500 italic">{selectedVoucher.room_details}</div>}
                      </td>
                      <td className="p-3 text-right font-bold text-primary-700">{selectedVoucher.meal_plan}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Requests */}
              {selectedVoucher.special_requests && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs">
                  <strong className="font-bold">Special Requests:</strong> {selectedVoucher.special_requests}
                </div>
              )}

              {/* Hotel Rules & Cancellation Policy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {selectedVoucher.hotel_rules && (
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1">
                      <ScrollText size={12} className="text-primary-600" /> Hotel Rules & Regulations
                    </span>
                    <p className="text-neutral-700 leading-relaxed text-[11px]">{selectedVoucher.hotel_rules}</p>
                  </div>
                )}
                {selectedVoucher.cancellation_policy && (
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-rose-700 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-rose-600" /> Cancellation Policy
                    </span>
                    <p className="text-rose-950 leading-relaxed text-[11px]">{selectedVoucher.cancellation_policy}</p>
                  </div>
                )}
              </div>

              {/* Status & Footer */}
              <div className="flex justify-between items-end pt-4 border-t border-neutral-200 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400">Reservation Status</div>
                  <div className="font-black text-emerald-600 uppercase text-sm mt-0.5">● {selectedVoucher.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 font-bold uppercase">Authorized Signature & Seal</div>
                  <div className="h-10 border-b border-dashed border-neutral-300 w-40 mt-1" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowVoucherModal(false)} className="btn-ghost flex-1">Close</button>
              <button onClick={() => window.print()} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Printer size={16} /> Print Confirmation Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
